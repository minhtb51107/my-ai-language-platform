import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { v4 as uuidv4 } from 'uuid';

@Entity('magic_link_tokens')
export class MagicLinkToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  token: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'timestamp', name: 'expires_at' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  static create(user: User): MagicLinkToken {
    const magicLink = new MagicLinkToken();
    magicLink.user = user;
    magicLink.token = uuidv4();
    // Set hết hạn sau 15 phút
    magicLink.expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    return magicLink;
  }

  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }
}