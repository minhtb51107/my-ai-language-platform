import { Injectable, Logger } from '@nestjs/common';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { BaseMessage, HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { ILLMProvider, Message } from '../interfaces/llm-provider.interface';

@Injectable()
export class OpenAIService implements ILLMProvider {
  private cheapModel: ChatOpenAI;
  private complexModel: ChatOpenAI;
  private embeddings: OpenAIEmbeddings;
  private readonly logger = new Logger(OpenAIService.name);

  constructor() {
    // 1. Mô hình Rẻ & Nhanh (Dùng cho 80% các tác vụ thông thường)
    this.cheapModel = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-4o-mini',
      temperature: 0.7,
      streaming: true,
    });

    // 2. Mô hình Xịn & Suy luận sâu (Dùng cho 20% các câu hỏi khó)
    // Nếu bạn có key của Anthropic, bạn hoàn toàn có thể dùng ChatAnthropic ở đây thay vì OpenAI
    this.complexModel = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-4o', 
      temperature: 0.3,
      streaming: true,
    });

    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small',
    });
    
    this.logger.log('🚀 Model Router (LangChain) đã sẵn sàng định tuyến!');
  }

  // Tiện ích chuyển đổi định dạng Message sang chuẩn của LangChain
  private mapMessages(messages: Message[]): BaseMessage[] {
    return messages.map(msg => {
      if (msg.role === 'system') return new SystemMessage(msg.content);
      if (msg.role === 'assistant') return new AIMessage(msg.content);
      return new HumanMessage(msg.content);
    });
  }

  // ==========================================
  // TẦNG ROUTER: TỰ ĐỘNG CHỌN MÔ HÌNH
  // ==========================================
  private routeModel(messages: Message[]): ChatOpenAI {
    // Lấy câu hỏi cuối cùng của người dùng để phân tích
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || '';
    const lowerInput = lastUserMessage.toLowerCase();
    
    // Thuật toán Router cơ bản: Phân loại theo từ khóa và độ dài
    const complexKeywords = [
      'phân tích', 'tại sao', 'giải thích chi tiết', 
      'so sánh', 'ngữ pháp nâng cao', 'tóm tắt toàn bộ', 'đánh giá'
    ];
    
    const isComplex = lastUserMessage.length > 200 || complexKeywords.some(kw => lowerInput.includes(kw));

    if (isComplex) {
      this.logger.log('🧠 [Model Router]: Câu hỏi PHỨC TẠP -> Chuyển hướng tới GPT-4o (Xịn/Đắt)');
      return this.complexModel;
    } else {
      this.logger.log('⚡ [Model Router]: Câu hỏi ĐƠN GIẢN -> Chuyển hướng tới GPT-4o-mini (Nhanh/Rẻ)');
      return this.cheapModel;
    }
  }

  // ==========================================
  // GIAO TIẾP VỚI GATEWAY (Kế thừa Interface cũ)
  // ==========================================
  async streamChat(messages: Message[]): Promise<AsyncIterable<string>> {
    // 1. Router tự chọn mô hình
    const selectedModel = this.routeModel(messages);
    
    // 2. Stream luồng dữ liệu
    const stream = await selectedModel.stream(this.mapMessages(messages));

    // 3. Chuẩn hóa lại chunk để tương thích ngược với ChatGateway cũ
    async function* normalizeStream() {
      for await (const chunk of stream) {
        if (chunk.content) yield chunk.content as string;
      }
    }
    return normalizeStream();
  }

  async generateText(messages: Message[]): Promise<string> {
    const selectedModel = this.routeModel(messages);
    const response = await selectedModel.invoke(this.mapMessages(messages));
    return response.content as string;
  }

  async createEmbedding(text: string): Promise<number[]> {
    return await this.embeddings.embedQuery(text);
  }

  getChatModel(): ChatOpenAI {
    return this.complexModel;
  }
}