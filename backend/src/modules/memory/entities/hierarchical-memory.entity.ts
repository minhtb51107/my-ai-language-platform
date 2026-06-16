import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ChatSession } from '../../chat/entities/chat-session.entity';

@Entity('hierarchical_memory')
export class HierarchicalMemory {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ChatSession, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chat_session_id' })
  chatSession: ChatSession;

  @Column({ name: 'hierarchy_level' })
  hierarchyLevel: number;

  @Column({ name: 'segment_start' })
  segmentStart: number;

  @Column({ name: 'segment_end' })
  segmentEnd: number;

  @Column({ type: 'text', name: 'summary_content' })
  summaryContent: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Self-referencing relationship
  @ManyToOne(() => HierarchicalMemory, (hm) => hm.childSummaries, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_summary_id' })
  parentSummary: HierarchicalMemory;

  @OneToMany(() => HierarchicalMemory, (hm) => hm.parentSummary)
  childSummaries: HierarchicalMemory[];
}