import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { SemanticCache } from './semantic-cache.entity';
import { OpenAIService } from '../llm/openai.service';

@Injectable()
export class SemanticCacheService {
  private readonly logger = new Logger(SemanticCacheService.name);
  
  // Ngưỡng 98%: Phải cực kỳ giống về ngữ nghĩa mới lấy cache để tránh AI trả lời râu ông nọ cắm cằm bà kia
  private readonly SIMILARITY_THRESHOLD = 0.98; 

  constructor(
    @InjectRepository(SemanticCache)
    private readonly cacheRepo: Repository<SemanticCache>,
    private readonly openaiService: OpenAIService,
    private readonly dataSource: DataSource,
  ) {}

  async getCachedResponse(query: string): Promise<string | null> {
    try {
      const embedding = await this.openaiService.createEmbedding(query);
      const vectorString = `[${embedding.join(',')}]`;

      const sql = `
        SELECT response, (1 - ("promptEmbedding" <=> $1)) as similarity
        FROM semantic_cache
        WHERE 1 - ("promptEmbedding" <=> $1) >= $2
        ORDER BY similarity DESC
        LIMIT 1
      `;

      const results = await this.dataSource.query(sql, [vectorString, this.SIMILARITY_THRESHOLD]);
      
      if (results && results.length > 0) {
        this.logger.log(`🎯 CACHE HIT! Tiết kiệm 100% token. Độ giống: ${(results[0].similarity * 100).toFixed(2)}%`);
        return results[0].response;
      }
      return null;
    } catch (e) {
      this.logger.error('Lỗi truy xuất Semantic Cache', e);
      return null; // Fallback an toàn: Có lỗi thì đi thẳng xuống hỏi AI
    }
  }

  async saveCache(query: string, response: string): Promise<void> {
    try {
      // Chạy ngầm (fire-and-forget) để không làm chậm response trả về cho user
      setImmediate(async () => {
        const embedding = await this.openaiService.createEmbedding(query);
        const cache = this.cacheRepo.create({
          prompt: query,
          response: response,
          promptEmbedding: embedding,
        });
        await this.cacheRepo.save(cache);
        this.logger.log(`💾 Đã lưu vào Semantic Cache: "${query}"`);
      });
    } catch (e) {
      this.logger.error('Lỗi khi lưu Semantic Cache', e);
    }
  }
}