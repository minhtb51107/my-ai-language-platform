import { Injectable, Logger } from '@nestjs/common';
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { Calculator } from '@langchain/community/tools/calculator';
import { tool } from '@langchain/core/tools'; // <-- Import core tools
import { z } from 'zod'; // <-- Import zod để định nghĩa schema
import { tavily } from '@tavily/core'; // <-- Import trực tiếp engine Tavily

import { OpenAIService } from '../llm/openai.service';
import { SemanticCacheService } from '../cache/semantic-cache.service';
import { GuardrailService } from '../guardrails/guardrail.service';
import { EvaluationService } from '../evaluations/evaluation.service';
import { MemoryToolFactory } from '../tools/memory.tool';

export interface AgentCallbacks {
  onStatus: (status: string | null) => void;
  onChunk: (chunk: string) => void;
}

export interface UserContext {
  emotion: string;
  preferences: any;
}

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private readonly openaiService: OpenAIService,
    private readonly semanticCacheService: SemanticCacheService,
    private readonly guardrailService: GuardrailService,
    private readonly evaluationService: EvaluationService,
    private readonly memoryToolFactory: MemoryToolFactory,
  ) {}

  async processMessage(
    userId: string,
    sessionId: string,
    message: string,
    chatHistory: any[],
    userContext: UserContext,
    callbacks: AgentCallbacks
  ): Promise<string> {
    
    // 1. TẦNG GUARDRAILS
    await this.guardrailService.validateInput(message);

    // 2. TẦNG CACHE (Bộ nhớ đệm)
    const cachedResponse = await this.semanticCacheService.getCachedResponse(message);
    if (cachedResponse) {
      callbacks.onStatus('⚡ Xử lý từ bộ nhớ đệm (0ms)...');
      const words = cachedResponse.split(' ');
      let tempFullMsg = '';
      for (const word of words) {
        tempFullMsg += word + ' ';
        callbacks.onChunk(word + ' ');
        await new Promise(r => setTimeout(r, 15));
      }
      callbacks.onStatus(null);
      return tempFullMsg.trim();
    }

    // 3. CHUẨN BỊ LỊCH SỬ & CÔNG CỤ
    const contextMessages = chatHistory.map(m => 
      m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
    );
    contextMessages.push(new HumanMessage(message));

    let capturedRagContext = '';
    const memoryTool = this.memoryToolFactory.createTool(userId, (context) => {
      capturedRagContext = context;
    });

    // TẠO TOOL TÌM KIẾM TRỰC TIẾP TỪ LÕI (Bypass lỗi của Langchain Community)
    const searchTool = tool(
      async ({ query }) => {
        const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
        const response = await tvly.search(query, { maxResults: 3 });
        return JSON.stringify(response.results);
      },
      {
        name: 'tavily_search_results_json',
        description: 'Công cụ tìm kiếm Internet cực mạnh để lấy thông tin mới nhất (thời tiết, tin tức sự kiện hiện tại, giá cả).',
        schema: z.object({
          query: z.string().describe('Câu truy vấn tìm kiếm cần tra trên Internet'),
        }),
      }
    );

    const calculatorTool = new Calculator();
    
    // Gộp tất cả đồ nghề cho AI
    const tools = [memoryTool, searchTool, calculatorTool];

    // 4. DYNAMIC SYSTEM PROMPT (Bơm linh hồn cho AI)
    const personalizedPrompt = `
Bạn là một chuyên gia giáo dục ngoại ngữ tận tâm và một trợ lý thông minh. 
QUY TẮC CÔNG CỤ:
1. HÃY DÙNG 'search_memory' ĐẦU TIÊN để tìm kiếm ngữ cảnh nếu người dùng hỏi kiến thức hoặc thông tin cũ.
2. HÃY DÙNG 'tavily_search_results_json' nếu người dùng hỏi các thông tin thời sự mới nhất (Thời tiết hôm nay, sự kiện vừa xảy ra...).
3. HÃY DÙNG 'calculator' nếu cần tính toán các phép toán học phức tạp.

[THÔNG TIN NGẦM VỀ HỌC VIÊN HIỆN TẠI]
- Trạng thái cảm xúc: ${userContext.emotion.toUpperCase()}
- Phong cách giao tiếp ưa thích: ${userContext.preferences.communicationStyle}
- Sở thích: ${JSON.stringify(userContext.preferences.favoriteTopics)}

Hãy điều chỉnh giọng điệu và cách dùng từ cho phù hợp với trạng thái cảm xúc của học viên một cách tinh tế. 
    `;

    // 5. CHẠY LUỒNG TƯ DUY LANGGRAPH
    const agent = createReactAgent({
      llm: this.openaiService.getChatModel(),
      tools: tools,
      messageModifier: new SystemMessage(personalizedPrompt.trim()), 
    });

    const stream = await agent.streamEvents({ messages: contextMessages }, { version: "v2" });
    let fullAiResponse = '';

    for await (const event of stream) {
      if (event.event === "on_tool_start") {
        if (event.name === "search_memory") callbacks.onStatus('🧠 Đang tìm kiếm tài liệu giáo trình...');
        else if (event.name === "tavily_search_results_json") callbacks.onStatus('🌐 Đang quét dữ liệu Internet...');
        else if (event.name === "calculator") callbacks.onStatus('🧮 Đang thực hiện phép tính...');
      }
      if (event.event === "on_tool_end") {
        callbacks.onStatus('✅ Đã thu thập xong dữ liệu...');
      }
      if (event.event === "on_chat_model_stream" && event.data?.chunk?.content) {
        const textChunk = event.data.chunk.content;
        if (typeof textChunk === 'string') {
          fullAiResponse += textChunk;
          callbacks.onChunk(textChunk);
        }
      }
    }

    callbacks.onStatus(null);
    await this.semanticCacheService.saveCache(message, fullAiResponse);

    // 6. CHẤM ĐIỂM NGẦM
    this.evaluationService.evaluateInteraction(
      sessionId, 
      message, 
      fullAiResponse, 
      capturedRagContext
    ).catch(e => this.logger.error('Lỗi khi chấm điểm ngầm', e));

    return fullAiResponse;
  }
}