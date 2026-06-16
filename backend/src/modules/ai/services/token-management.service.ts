import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { get_encoding, Tiktoken } from 'tiktoken';

@Injectable()
export class TokenManagementService implements OnModuleDestroy {
  private readonly logger = new Logger(TokenManagementService.name);
  private readonly encoder: Tiktoken;

  constructor() {
    // cl100k_base là thuật toán mã hóa token chuẩn của GPT-3.5 và GPT-4o
    this.encoder = get_encoding('cl100k_base');
  }

  /**
   * Đếm số lượng token chính xác tuyệt đối
   */
  countTokens(text: string): number {
    if (!text || text.trim().length === 0) return 0;
    try {
      const tokens = this.encoder.encode(text);
      return tokens.length;
    } catch (error: any) {
      this.logger.error('Error counting tokens, using fallback estimator', error.stack);
      // Fallback thô: 1 token ~ 4 ký tự (Quy tắc chung của OpenAI)
      return Math.ceil(text.length / 4);
    }
  }

  onModuleDestroy() {
    // Giải phóng bộ nhớ C++ của tiktoken khi tắt server
    if (this.encoder) {
      this.encoder.free();
    }
  }
}