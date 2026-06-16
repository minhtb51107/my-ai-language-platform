import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, UpdateDateColumn } from 'typeorm';
import { ChatSession } from '../../chat/entities/chat-session.entity';

@Entity('memory_summaries')
export class MemorySummary {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ChatSession, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chat_session_id' })
  chatSession: ChatSession;

  @Column({ type: 'text', nullable: true })
  summaryContent: string;

  @UpdateDateColumn({ name: 'last_updated' })
  lastUpdated: Date;

  @Column({ name: 'tokens_used', default: 0 })
  tokensUsed: number;

  @Column({ type: 'text', name: 'update_reason', nullable: true })
  updateReason: string;

  @Column({ name: 'summary_type', nullable: true })
  summaryType: string;

  @Column({ name: 'last_message_id_summarized', nullable: true })
  lastMessageIdSummarized: number;

  @Column({ type: 'text', name: 'conversation_goal', nullable: true })
  conversationGoal: string;

  @Column({ name: 'user_persona', nullable: true })
  userPersona: string;

  @Column({ type: 'text', name: 'global_context', nullable: true })
  globalContext: string;

  @Column({ name: 'conversation_stage', nullable: true })
  conversationStage: string;

  @Column({ name: 'topic_segment', default: 0 })
  topicSegment: number;
}