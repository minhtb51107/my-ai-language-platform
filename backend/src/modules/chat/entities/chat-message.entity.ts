import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ChatSession } from './chat-session.entity';
import { MessageRole } from '../chat.enums';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: MessageRole })
  role: MessageRole;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ type: 'jsonb', nullable: true })
  analysisResult: any;

  @Column({ type: 'varchar', length: 20, nullable: true })
  rating: 'like' | 'dislike' | null;

  // THÊM: Cột JSONB để lưu danh sách file đính kèm (URL, name, type)
  @Column({ type: 'jsonb', nullable: true })
  attachments: any[];

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => ChatSession, session => session.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: ChatSession;
}