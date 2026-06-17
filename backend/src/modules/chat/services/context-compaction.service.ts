import { Injectable, Logger } from '@nestjs/common';
import { TokenManagementService } from '../../ai/llm/token-management.service';
import { OpenAIService } from '../../ai/llm/openai.service';

@Injectable()
export class ContextCompactionService {
  private readonly logger = new Logger(ContextCompactionService.name);
  
  // Ngưỡng an toàn: Ví dụ GPT-4o-mini hỗ trợ 128k token, nhưng ta giới hạn gửi 6000 token 
  // để tối ưu chi phí API (Cost Optimization) và tốc độ phản hồi.
  private readonly MAX_CONTEXT_TOKENS = 6000; 

  constructor(
    private readonly tokenManager: TokenManagementService,
    private readonly openaiService: OpenAIService, // Inject LLM để nhờ nó tóm tắt
  ) {}

  /**
   * Đánh giá và Nén ngữ cảnh nếu cần thiết (Học từ compaction.ts của Chatbox)
   */
  async optimizeAndCompactContext(messages: any[], model: string): Promise<any[]> {
    const totalTokens = this.tokenManager.countMessagesTokens(messages, model);
    
    // Nếu vẫn nằm trong ngưỡng an toàn -> Gửi nguyên vẹn
    if (totalTokens <= this.MAX_CONTEXT_TOKENS) {
      this.logger.log(`Context an toàn: ${totalTokens} tokens. Không cần nén.`);
      return messages;
    }

    this.logger.warn(`Context quá tải: ${totalTokens} tokens. Kích hoạt Compaction (Nén)...`);

    // LUẬT NÉN (COMPACTION RULE): 
    // Giữ lại System Prompt (index 0) và 4 tin nhắn gần nhất.
    // Tóm tắt toàn bộ phần ở giữa.

    const systemPrompt = messages[0].role === 'system' ? messages[0] : null;
    const coreMessages = systemPrompt ? messages.slice(1) : messages;

    // Giữ 4 tin cuối làm "Trí nhớ ngắn hạn"
    const KEEP_RECENT = 4;
    const messagesToSummarize = coreMessages.slice(0, coreMessages.length - KEEP_RECENT);
    const recentMessages = coreMessages.slice(coreMessages.length - KEEP_RECENT);

    if (messagesToSummarize.length === 0) return messages; // Không có gì để nén

    // GỌI AI TÓM TẮT QUÁ KHỨ
    const conversationToText = messagesToSummarize.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
    const summaryPrompt = `Bạn là hệ thống nén bộ nhớ. Hãy tóm tắt ngắn gọn nhưng không làm mất chi tiết quan trọng (đặc biệt là code, thông tin kỹ thuật, tên riêng) của đoạn hội thoại sau:\n\n${conversationToText}`;
    
    try {
      const summaryResult = await this.openaiService.generateText([
        { role: 'system', content: summaryPrompt }
      ]);

      // TẠO MẢNG TIN NHẮN MỚI SAU KHI NÉN
      const newSystemContent = systemPrompt 
        ? `${systemPrompt.content}\n\n[TRÍ NHỚ QUÁ KHỨ]:\n${summaryResult}`
        : `Bạn là trợ lý AI. Dưới đây là bối cảnh quá khứ của cuộc trò chuyện:\n${summaryResult}`;

      const optimizedMessages = [
        { role: 'system', content: newSystemContent },
        ...recentMessages
      ];

      const newTokens = this.tokenManager.countMessagesTokens(optimizedMessages, model);
      this.logger.log(`Nén thành công! Giảm từ ${totalTokens} xuống còn ${newTokens} tokens.`);
      
      return optimizedMessages;
    } catch (error) {
      this.logger.error("Lỗi nén ngữ cảnh, gửi cắt khúc dự phòng:", error);
      // Fallback: Nếu AI lỗi, dùng phương pháp cắt mảng thô sơ (giữ lại 10 tin cuối)
      return systemPrompt 
        ? [systemPrompt, ...coreMessages.slice(-10)] 
        : coreMessages.slice(-10);
    }
  }
}