import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('evaluation_results')
export class EvaluationResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar')
  sessionId: string;

  @Column('text')
  userQuestion: string;

  @Column('text')
  aiResponse: string;

  // Điểm số: Câu trả lời có bám sát tài liệu RAG không? (Chống bịa đặt/ảo giác)
  @Column('float')
  faithfulnessScore: number;

  // Điểm số: Câu trả lời có đúng trọng tâm câu hỏi không?
  @Column('float')
  relevanceScore: number;

  // Lời phê của AI Giám khảo
  @Column('text', { nullable: true })
  reasoning: string;

  @CreateDateColumn()
  createdAt: Date;
}