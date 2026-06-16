import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('user_preferences')
export class UserPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // JSONB lưu Map: topic -> interest level (0.0-1.0)
  @Column({ name: 'favorite_topics', type: 'jsonb', default: {} })
  favoriteTopics: Record<string, number>;

  @Column({ name: 'communication_style', nullable: true })
  communicationStyle: string; // formal, casual, technical, simple

  @Column({ name: 'detail_preference', nullable: true })
  detailPreference: string; // concise, detailed, balanced

  @Column({ name: 'learning_style', nullable: true })
  learningStyle: string; // visual, auditory, kinesthetic

  // Thay thế @ElementCollection bằng kiểu text array của Postgres
  @Column({ name: 'disliked_content', type: 'text', array: true, default: [] })
  dislikedContent: string[];
}