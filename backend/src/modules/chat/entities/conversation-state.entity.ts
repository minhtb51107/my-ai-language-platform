import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, UpdateDateColumn } from 'typeorm';
import { ChatSession } from './chat-session.entity';
import { ConversationStage } from '../enums/conversation-stage.enum';

@Entity('conversation_states')
export class ConversationState {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => ChatSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  chatSession: ChatSession;

  @Column({ name: 'current_intent', nullable: true })
  currentIntent: string;

  @Column({ name: 'current_topic', nullable: true })
  currentTopic: string;

  @Column({ name: 'conversation_stage', type: 'varchar', default: ConversationStage.UNKNOWN })
  conversationStage: string; // Lưu ý: có thể dùng type enum nếu muốn chặt chẽ

  @Column({ name: 'needs_clarification', default: false })
  needsClarification: boolean;

  @Column({ name: 'pending_question', type: 'text', nullable: true })
  pendingQuestion: string;

  @Column({ name: 'frustration_level', type: 'int', default: 0 })
  frustrationLevel: number; // 0-10

  @Column({ name: 'satisfaction_score', type: 'int', default: 5 })
  satisfactionScore: number; // 1-10

  @UpdateDateColumn({ name: 'last_state_change' })
  lastStateChange: Date;

  // Thay thế @ElementCollection bằng text array
  @Column({ name: 'state_history', type: 'text', array: true, default: [] })
  stateHistory: string[];
}