import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('knowledge_chunks')
export class KnowledgeChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User; // Nếu null: kiến thức chung. Nếu có ID: Ký ức cá nhân hóa của user

  @Column({ type: 'text' })
  content: string;

  // Dùng PostgreSQL Vector Extension để lưu chuỗi embeddings
  @Column({ type: 'vector', length: 1536, nullable: true })
  embedding: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}