import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('knowledge_chunks')
export class KnowledgeChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'user_id' })
  // Đánh index cho user_id để tăng tốc query lấy ký ức riêng của từng user
  @Index('idx_knowledge_chunk_user') 
  user: User; 

  @Column({ type: 'text' })
  content: string;

  // Sử dụng array để dễ map với OpenAI response thay vì string
  @Column({ 
    type: 'vector', 
    length: 1536, // Trùng với dimension của text-embedding-3-small / ada-002
    nullable: true 
  })
  embedding: number[]; // Đổi sang number[] hoặc string (nhưng lúc save phải ép kiểu thành string `[0.1, 0.2]`)

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}