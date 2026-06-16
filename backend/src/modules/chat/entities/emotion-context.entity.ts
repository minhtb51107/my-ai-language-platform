import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, UpdateDateColumn } from 'typeorm';
import { ChatSession } from './chat-session.entity';
import { User } from '../../user/entities/user.entity';

@Entity('emotion_contexts')
export class EmotionContext {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ChatSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  chatSession: ChatSession;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'current_emotion', nullable: true })
  currentEmotion: string; // happy, sad, angry, neutral, excited

  @Column({ name: 'emotion_intensity', type: 'float', nullable: true })
  emotionIntensity: number; // 0.0 to 1.0

  // Thay thế @ElementCollection bằng JSONB để lưu lịch sử (timestamp -> emotion)
  @Column({ name: 'emotion_history', type: 'jsonb', default: {} })
  emotionHistory: Record<string, string>;

  @UpdateDateColumn({ name: 'last_updated' })
  lastUpdated: Date;
}