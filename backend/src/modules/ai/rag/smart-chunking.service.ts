import { Injectable } from '@nestjs/common';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { TokenManagementService } from '../services/token-management.service';

@Injectable()
export class SmartChunkingService {
  constructor(private readonly tokenManagement: TokenManagementService) {}

  /**
   * Cắt văn bản lớn thành các chunk nhỏ hơn dựa trên Token sử dụng LangChain
   * @param maxTokens Số token tối đa cho 1 chunk (chuẩn RAG thường là 500-1000)
   * @param overlapTokens Số token gối đầu để giữ liên kết ngữ nghĩa giữa 2 chunk
   */
  async chunkText(text: string, maxTokens: number = 500, overlapTokens: number = 50): Promise<string[]> {
    if (!text || text.trim().length === 0) return [];

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: maxTokens,
      chunkOverlap: overlapTokens,
      // Sử dụng TokenManagementService của bạn để đếm chính xác bằng cl100k_base
      lengthFunction: (str) => this.tokenManagement.countTokens(str),
      // Langchain sẽ ưu tiên cắt theo thứ tự này để giữ ngữ nghĩa
      separators: ["\n\n", "\n", ".", "?", "!", " ", ""],
    });

    const documents = await splitter.createDocuments([text]);
    
    // Trả về mảng các chuỗi text đã được chunk
    return documents.map(doc => doc.pageContent);
  }
}