import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmartChunkingService {
  private readonly logger = new Logger(SmartChunkingService.name);

  /**
   * Băm nhỏ văn bản Markdown theo ngữ nghĩa (Tiêu đề, Đoạn văn)
   */
  async chunkText(markdownText: string): Promise<string[]> {
    this.logger.log('Bắt đầu Semantic Chunking (Băm theo ngữ nghĩa Markdown)...');
    
    // 1. Cắt văn bản theo các Tiêu đề Heading 2 và 3 (## hoặc ###)
    // RegExp này tìm các dòng bắt đầu bằng ## hoặc ### và lấy nó làm điểm chia
    const sections = markdownText.split(/(?=^##\s|^###\s)/m);
    
    const finalChunks: string[] = [];
    const MAX_CHUNK_LENGTH = 1500; // Khoảng ~500 tokens
    
    for (const section of sections) {
      const trimmedSection = section.trim();
      if (!trimmedSection) continue;

      // Nếu 1 section (chương) quá dài, cắt nhỏ tiếp theo đoạn văn (Double newline)
      if (trimmedSection.length > MAX_CHUNK_LENGTH) {
        const paragraphs = trimmedSection.split(/\n\n/);
        let currentChunk = '';

        for (const p of paragraphs) {
          if ((currentChunk.length + p.length) < MAX_CHUNK_LENGTH) {
            currentChunk += (currentChunk ? '\n\n' : '') + p;
          } else {
            if (currentChunk) finalChunks.push(currentChunk);
            currentChunk = p;
          }
        }
        if (currentChunk) finalChunks.push(currentChunk);
      } else {
        // Nếu section vừa vặn, giữ nguyên (Tối ưu nhất cho RAG)
        finalChunks.push(trimmedSection);
      }
    }

    this.logger.log(`Hoàn tất! Băm được ${finalChunks.length} chunks chất lượng cao.`);
    return finalChunks;
  }
}