import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import { EvaluationResult } from './evaluation-result.entity';

@Injectable()
export class EvaluationService {
  private evaluatorModel: ChatOpenAI;
  private readonly logger = new Logger(EvaluationService.name);

  constructor(
    @InjectRepository(EvaluationResult)
    private readonly evalRepo: Repository<EvaluationResult>,
  ) {
    // Dùng mô hình giá rẻ nhưng thông minh đủ để làm giám khảo
    this.evaluatorModel = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-4o-mini',
      temperature: 0, // Nhiệt độ 0 để chấm điểm khách quan, không sáng tạo
    });
  }

  /**
   * Hàm này sẽ được gọi ngầm (Background Job) sau mỗi lượt chat
   */
  async evaluateInteraction(
    sessionId: string,
    question: string,
    response: string,
    ragContext: string
  ): Promise<void> {
    try {
      // 1. Định nghĩa cấu trúc điểm số (0 - 100) mà Giám khảo phải trả về
      const evaluationSchema = z.object({
        faithfulness: z.number().min(0).max(100).describe("Điểm bám sát tài liệu RAG (0-100). Trừ điểm nếu AI bịa đặt thông tin không có trong RAG."),
        relevance: z.number().min(0).max(100).describe("Điểm bám sát câu hỏi (0-100). Trừ điểm nếu trả lời lan man, không đúng trọng tâm."),
        reasoning: z.string().describe("Giải thích ngắn gọn lý do cho điểm số này."),
      });

      // 2. Ép mô hình trả về đúng chuẩn JSON
      const structuredEvaluator = this.evaluatorModel.withStructuredOutput(evaluationSchema);

      // 3. Xây dựng Prompt cho Giám khảo
      const prompt = `
        Bạn là Giám khảo đánh giá chất lượng hệ thống AI. Hãy chấm điểm phản hồi sau:
        
        [CÂU HỎI CỦA NGƯỜI DÙNG]: ${question}
        [TÀI LIỆU RAG CUNG CẤP CHO AI]: ${ragContext || 'Không có tài liệu'}
        [CÂU TRẢ LỜI CỦA AI]: ${response}
        
        Nhiệm vụ: Chấm điểm Faithfulness và Relevance.
      `;

      // 4. Bắt đầu chấm điểm
      this.logger.log(`⏳ Đang chấm điểm tự động cho Session: ${sessionId}...`);
      const result = await structuredEvaluator.invoke(prompt);

      // 5. Lưu kết quả vào Database
      const evaluationRecord = this.evalRepo.create({
        sessionId,
        userQuestion: question,
        aiResponse: response,
        faithfulnessScore: result.faithfulness,
        relevanceScore: result.relevance,
        reasoning: result.reasoning,
      });

      await this.evalRepo.save(evaluationRecord);
      
      // 6. Cảnh báo khẩn cấp nếu AI trả lời quá tệ (Báo cho Dev)
      if (result.faithfulness < 50 || result.relevance < 50) {
        this.logger.warn(`🚨 [BÁO ĐỘNG] AI TRẢ LỜI KÉM! Session: ${sessionId} | Lý do: ${result.reasoning}`);
      } else {
        this.logger.log(`✅ Chấm điểm xong! Faithfulness: ${result.faithfulness}, Relevance: ${result.relevance}`);
      }

    } catch (error) {
      this.logger.error('Lỗi khi chạy Evaluation Service', error);
    }
  }
}