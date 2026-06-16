import { Injectable, Logger } from '@nestjs/common';
import { CohereClient } from 'cohere-ai';

@Injectable()
export class CohereRerankService {
  private cohere: CohereClient | null = null;
  private readonly logger = new Logger(CohereRerankService.name);

  constructor() {
    const apiKey = process.env.COHERE_API_KEY;
    if (apiKey) {
      this.cohere = new CohereClient({ token: apiKey });
      this.logger.log('✅ Cohere Rerank Service đã sẵn sàng!');
    } else {
      this.logger.warn('COHERE_API_KEY chưa được cấu hình. Hệ thống sẽ bỏ qua Reranking.');
    }
  }

  /**
   * Đánh giá và sắp xếp lại các tài liệu dựa trên độ phù hợp với câu hỏi
   * @param query Câu hỏi của người dùng
   * @param documents Danh sách các đoạn văn bản thô lấy từ Vector DB
   * @param topN Số lượng tài liệu tốt nhất muốn giữ lại
   * @returns Danh sách văn bản đã được lọc và sắp xếp
   */
  async rerank(query: string, documents: string[], topN: number = 3): Promise<string[]> {
    if (!this.cohere || documents.length === 0) {
      // Fallback: Nếu không có API key, trả về đúng số lượng ban đầu
      return documents.slice(0, topN);
    }

    try {
      const response = await this.cohere.rerank({
        model: 'rerank-multilingual-v3.0',
        query: query,
        documents: documents,
        topN: topN,
      });

      // Cohere trả về danh sách index đã được sắp xếp theo điểm số từ cao xuống thấp
      return response.results.map(result => documents[result.index]);
    } catch (error) {
      this.logger.error('Lỗi khi gọi Cohere Rerank API, fallback về kết quả gốc', error);
      return documents.slice(0, topN);
    }
  }
}