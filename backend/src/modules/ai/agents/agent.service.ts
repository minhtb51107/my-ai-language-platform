import { Injectable, Logger } from '@nestjs/common';
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";

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
    userContext: UserContext, // Nhận thông tin cá nhân hóa từ Gateway
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

    // 4. ⚡ TỐI ƯU HÓA: DYNAMIC SYSTEM PROMPT (Bơm linh hồn cho AI)
    const personalizedPrompt = `
Bạn là một chuyên gia giáo dục ngoại ngữ (Tiếng Anh) tận tâm. 
Quy tắc:
1. HÃY DÙNG CÔNG CỤ 'search_memory' ĐẦU TIÊN để tìm kiếm ngữ cảnh nếu người dùng hỏi kiến thức hoặc thông tin cũ.
2. Nếu người dùng sai ngữ pháp, hãy sửa lỗi một cách lịch sự.
3. Dùng tiếng Anh để giao tiếp, chỉ dùng tiếng Việt nếu khái niệm quá khó.

[THÔNG TIN NGẦM VỀ HỌC VIÊN HIỆN TẠI]
- Trạng thái cảm xúc: ${userContext.emotion.toUpperCase()}
- Phong cách giao tiếp ưa thích: ${userContext.preferences.communicationStyle}
- Sở thích: ${JSON.stringify(userContext.preferences.favoriteTopics)}

Hãy điều chỉnh giọng điệu và cách dùng từ cho phù hợp với trạng thái cảm xúc của học viên một cách tinh tế. Ví dụ, nếu họ đang buồn bực (SAD/ANGRY), hãy an ủi khích lệ. Nếu vui (EXCITED), hãy hòa chung niềm vui.
    `;

    // 5. CHẠY LUỒNG TƯ DUY LANGGRAPH
    const agent = createReactAgent({
      llm: this.openaiService.getChatModel(),
      tools: [memoryTool],
      messageModifier: new SystemMessage(personalizedPrompt.trim()), 
    });

    const stream = await agent.streamEvents({ messages: contextMessages }, { version: "v2" });
    let fullAiResponse = '';

    for await (const event of stream) {
      if (event.event === "on_tool_start" && event.name === "search_memory") {
        callbacks.onStatus('🧠 Đang tìm kiếm tài liệu giáo trình...');
      }
      if (event.event === "on_tool_end" && event.name === "search_memory") {
        callbacks.onStatus('✅ Đã tìm thấy, đang tổng hợp câu trả lời...');
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