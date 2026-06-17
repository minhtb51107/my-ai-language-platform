import { Injectable, Logger } from '@nestjs/common';
import { encoding_for_model, TiktokenModel } from 'tiktoken';

@Injectable()
export class TokenManagementService {
  private readonly logger = new Logger(TokenManagementService.name);

  /**
   * Đếm chính xác số lượng token của một văn bản dựa trên model đang dùng
   */
  countTokens(text: string, model: string = 'gpt-4o-mini'): number {
    if (!text) return 0;
    
    try {
      // Tiktoken đôi khi chưa update tên model mới nhất, ta fallback về chuẩn gpt-4
      const modelName = model.includes('gpt-4') ? 'gpt-4' : 'gpt-3.5-turbo';
      const encoding = encoding_for_model(modelName as TiktokenModel);
      
      const tokens = encoding.encode(text);
      const count = tokens.length;
      
      encoding.free(); // Bắt buộc phải free() để tránh tràn RAM (Memory Leak) trong C++
      return count;
    } catch (error) {
      this.logger.warn(`Lỗi khi dùng tiktoken cho model ${model}, chuyển sang đếm xấp xỉ.`);
      // Fallback: Tiếng Việt thường 1 token ~ 2.5 - 3 ký tự
      return Math.ceil(text.length / 3);
    }
  }

  /**
   * Đếm tổng Token của một mảng lịch sử tin nhắn
   */
  countMessagesTokens(messages: any[], model: string = 'gpt-4o-mini'): number {
    const fullText = messages.map(m => `${m.role}: ${m.content}`).join('\n');
    return this.countTokens(fullText, model);
  }
}