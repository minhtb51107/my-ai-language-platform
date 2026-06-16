import { Injectable, Logger } from '@nestjs/common';
import { OpenAIService } from '../../ai/llm/openai.service';
import { ChatMessage } from '../../chat/entities/chat-message.entity';

export interface MemorySummaryResult {
  content: string;
  tokensUsed: number;
  reason: string;
}

@Injectable()
export class MemorySummarizerService {
  private readonly logger = new Logger(MemorySummarizerService.name);

  constructor(private readonly openAIService: OpenAIService) {}

  async summarize(messages: ChatMessage[], reason: string): Promise<MemorySummaryResult> {
    try {
      // Changed msg.sender to msg.role to match ChatMessage entity
      const context = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
      const minLength = 80;
      const maxLength = 400;

      const systemPrompt = "Bạn là trợ lý AI. Hãy tóm tắt cuộc trò chuyện sau, giữ lại các ý quan trọng, không bỏ sót thông tin cần thiết. Tóm tắt phải rõ ràng, đủ ý, không quá ngắn hoặc quá dài. Độ dài lý tưởng: 80-400 ký tự.";

      let result = await this.openAIService.generateText([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: context }
      ]);
      
      const tokenCount = Math.floor(context.length / 4);

      if (result.length < minLength) {
        const retryPrompt = "Tóm tắt trên quá ngắn. Hãy tóm tắt lại chi tiết hơn, giữ đủ ý quan trọng.";
        result = await this.openAIService.generateText([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: context + "\n" + retryPrompt }
        ]);
      }

      if (result.length > maxLength) {
        result = result.substring(0, maxLength);
      }

      return { content: result, tokensUsed: tokenCount, reason };
    } catch (error) {
      this.logger.error("Lỗi khi tóm tắt hội thoại", error);
      return { content: "", tokensUsed: 0, reason };
    }
  }
}