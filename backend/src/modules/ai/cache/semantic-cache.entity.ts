import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('semantic_cache')
export class SemanticCache {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  prompt: string;

  @Column('text')
  response: string;

  // Model 'text-embedding-3-small' của OpenAI trả về vector 1536 chiều
  @Column('vector', { length: 1536 }) 
  promptEmbedding: number[];

  @CreateDateColumn()
  createdAt: Date;
}