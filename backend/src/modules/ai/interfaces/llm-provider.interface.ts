export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ILLMProvider {
  /**
   * Gọi mô hình và trả về luồng text (streaming)
   */
  streamChat(messages: Message[], options?: any): Promise<AsyncIterable<string>>;
  
  /**
   * Gọi mô hình và chờ kết quả trả về toàn bộ (dành cho các task ngầm như tóm tắt)
   */
  generateText(messages: Message[], options?: any): Promise<string>;
}