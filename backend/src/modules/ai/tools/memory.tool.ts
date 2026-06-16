import { Injectable, Logger } from '@nestjs/common';
import { DynamicTool } from '@langchain/core/tools';
import { MemoryService } from '../../memory/services/memory.service';

@Injectable()
export class MemoryToolFactory {
  private readonly logger = new Logger(MemoryToolFactory.name);

  constructor(private readonly memoryService: MemoryService) {}

  /**
   * Tạo công cụ tìm kiếm ký ức cho Agent.
   * @param userId - ID người dùng để lọc CSDL
   * @param onContextCaptured - Callback để lấy lại ngữ cảnh RAG (dùng cho chấm điểm)
   */
  createTool(userId: string, onContextCaptured: (context: string) => void): DynamicTool {
    return new DynamicTool({
      name: "search_memory",
      description: "Dùng công cụ này để tìm kiếm kiến thức hoặc quy tắc ngữ pháp từ cơ sở dữ liệu hệ thống.",
      func: async (input: string) => {
        this.logger.log(`🤖 Agent đang gọi Tool RAG: "${input}"`);
        const rag = await this.memoryService.searchRelevantKnowledge(userId, input, 3);
        const context = rag || 'Không tìm thấy thông tin bổ sung.';
        
        // Bắn ngữ cảnh ra ngoài cho AgentService lưu lại
        onContextCaptured(context);
        
        return context;
      }
    });
  }
}