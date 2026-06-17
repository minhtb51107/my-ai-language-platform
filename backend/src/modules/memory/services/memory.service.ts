import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm'; 
import { KnowledgeChunk } from '../entities/knowledge-chunk.entity';
import { OpenAIService } from '../../ai/llm/openai.service';
import { CohereRerankService } from '../../ai/rag/cohere-rerank.service';

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(
    @InjectRepository(KnowledgeChunk)
    private readonly knowledgeRepo: Repository<KnowledgeChunk>,
    private readonly openaiService: OpenAIService,
    private readonly cohereRerankService: CohereRerankService,
    private readonly dataSource: DataSource, 
  ) {}

  /**
   * Truy xuất Ký ức bằng Hybrid Search (Vector + Full-Text Keyword) + Cohere Rerank
   */
  async searchRelevantKnowledge(userId: string, query: string, topK: number = 3): Promise<string> {
    try {
      const queryEmbedding = await this.openaiService.createEmbedding(query);
      const vectorString = `[${queryEmbedding.join(',')}]`;
      const fetchLimit = topK * 3; 

      // 1. TỐI ƯU HÓA: HYBRID SEARCH VỚI CTE (Common Table Expression)
      const querySql = `
        WITH semantic_search AS (
          SELECT id, content, (1 - (embedding <=> $1::vector)) AS vector_score
          FROM knowledge_chunks
          WHERE (user_id = $2 OR user_id IS NULL)
          ORDER BY embedding <=> $1::vector
          LIMIT $4
        ),
        keyword_search AS (
          SELECT id, content, ts_rank_cd(to_tsvector('simple', content), plainto_tsquery('simple', $3)) AS keyword_score
          FROM knowledge_chunks
          WHERE (user_id = $2 OR user_id IS NULL)
            AND to_tsvector('simple', content) @@ plainto_tsquery('simple', $3)
          ORDER BY keyword_score DESC
          LIMIT $4
        )
        SELECT 
          COALESCE(s.id, k.id) AS id,
          COALESCE(s.content, k.content) AS content,
          (COALESCE(s.vector_score, 0) * 0.7) + (COALESCE(k.keyword_score, 0) * 0.3) AS final_score
        FROM semantic_search s
        FULL OUTER JOIN keyword_search k ON s.id = k.id
        ORDER BY final_score DESC
        LIMIT $4
      `;

      const rawChunks = await this.dataSource.query(querySql, [vectorString, userId, query, fetchLimit]);

      if (!rawChunks || rawChunks.length === 0) return '';

      const documents = rawChunks.map((chunk: any) => chunk.content);

      // 2. STAGE 2: Cohere Reranking
      const rerankedDocs = await this.cohereRerankService.rerank(query, documents, topK);

      if (!rerankedDocs || rerankedDocs.length === 0) return '';

      return rerankedDocs
        .map((text, index) => `[Tài liệu ${index + 1}]: ${text}`)
        .join('\n\n');
      
    } catch (error: any) {
      this.logger.error('Lỗi khi truy xuất Ký ức (Hybrid Search):', error.stack);
      throw new InternalServerErrorException('Lỗi hệ thống RAG Pipeline');
    }
  }

  async saveKnowledge(userId: string | null, content: string, metadata?: Record<string, any>): Promise<KnowledgeChunk> {
    const embedding = await this.openaiService.createEmbedding(content);
    const vectorString = `[${embedding.join(',')}]`;

    const newChunk = this.knowledgeRepo.create({
      content: content,
      embedding: vectorString as any,
      metadata: metadata,
      user: userId ? { id: userId } : undefined,
    });

    return this.knowledgeRepo.save(newChunk);
  }

  async getUserManualMemories(userId: string): Promise<KnowledgeChunk[]> {
    return this.knowledgeRepo.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' }
    });
  }
  
  async deleteMemory(memoryId: string, userId: string): Promise<void> {
    const memory = await this.knowledgeRepo.findOne({ where: { id: memoryId, user: { id: userId } } });
    if (memory) await this.knowledgeRepo.remove(memory);
  }

  // ==========================================
  // THÊM MỚI: QUẢN LÝ KHO TÀI LIỆU RAG (FILE UPLOAD)
  // ==========================================

  // Lấy danh sách các tài liệu đã tải lên (Gom nhóm theo metadata->sourceName)
  async getUserDocuments(userId: string) {
    const sql = `
      SELECT 
        metadata->>'sourceName' as name, 
        COUNT(id) as "chunkCount", 
        MAX(created_at) as "uploadedAt"
      FROM knowledge_chunks
      WHERE user_id = $1 AND metadata->>'sourceName' IS NOT NULL
      GROUP BY metadata->>'sourceName'
      ORDER BY "uploadedAt" DESC
    `;
    return this.dataSource.query(sql, [userId]);
  }

  // Xóa toàn bộ Chunk của một tài liệu
  async deleteDocument(userId: string, sourceName: string) {
    const sql = `
      DELETE FROM knowledge_chunks 
      WHERE user_id = $1 AND metadata->>'sourceName' = $2
    `;
    await this.dataSource.query(sql, [userId, sourceName]);
    return { success: true, message: `Đã xóa tài liệu ${sourceName}` };
  }
}