import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitPgVector1710000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector;`);

    // Index cho RAG Knowledge
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding 
      ON knowledge_chunks 
      USING hnsw (embedding vector_cosine_ops);
    `);

    // 🚨 THÊM INDEX NÀY CHO SEMANTIC CACHE (Cực kỳ quan trọng để Cache đạt 0ms)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_semantic_cache_embedding 
      ON semantic_cache 
      USING hnsw ("promptEmbedding" vector_cosine_ops); 
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_semantic_cache_embedding;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_knowledge_chunks_embedding;`);
  }
}