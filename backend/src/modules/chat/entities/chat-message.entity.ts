import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ChatSession } from './chat-session.entity';
import { MessageRole } from '../chat.enums';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ChatSession, session => session.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: ChatSession;

  @Column({ type: 'enum', enum: MessageRole })
  role: MessageRole;

  @Column({ type: 'text' })
  content: string;

  // Phân tích cảm xúc hoặc điểm số câu phát âm/ngữ pháp của người dùng
  @Column({ type: 'jsonb', nullable: true })
  analysisResult: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}