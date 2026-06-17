import { encode } from 'gpt-tokenizer';

// ✅ Đã thay thế Enum bằng Union Type (An toàn với erasableSyntaxOnly)
export type MessageRole = 'system' | 'user' | 'assistant' | 'ai';

export interface ChatMessageTokens {
  role: MessageRole | string;
  content: string;
}

export class TokenEstimator {
  static countString(text: string): number {
    if (!text) return 0;
    try {
      return encode(text).length;
    } catch (e) {
      return Math.ceil(text.length / 3);
    }
  }

  static countMessages(messages: ChatMessageTokens[]): number {
    if (!messages || messages.length === 0) return 0;
    
    let totalTokens = 0;
    for (const msg of messages) {
      totalTokens += 4; 
      totalTokens += this.countString(msg.content);
    }
    totalTokens += 3; 
    return totalTokens;
  }

  static truncateToFitContext(
    messages: ChatMessageTokens[],
    maxTokens: number = 4000
  ): ChatMessageTokens[] {
    let currentTokens = this.countMessages(messages);
    
    if (currentTokens <= maxTokens) {
      return messages;
    }

    const truncated = [...messages];
    // ✅ So sánh trực tiếp với chuỗi 'system' thay vì dùng Enum
    const startIndex = (truncated[0]?.role === 'system') ? 1 : 0;

    while (currentTokens > maxTokens && truncated.length > startIndex + 1) {
      truncated.splice(startIndex, 2);
      currentTokens = this.countMessages(truncated);
    }

    return truncated;
  }
}