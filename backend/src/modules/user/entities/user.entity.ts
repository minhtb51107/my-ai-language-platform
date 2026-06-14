import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  VersionColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserStatus, Gender, AccountType } from '../user.enums';
import { Role } from './role.entity';
import { SocialAccount } from '../../auth/entities/social-account.entity';

@Entity('users')
@Index('idx_user_email', ['email'])
@Index('idx_user_handle', ['handle'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  email: string;

  @Column({ type: 'varchar', nullable: false, select: false }) // select: false tương đương @JsonIgnore
  password?: string;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.PENDING_ACTIVATION })
  status: UserStatus;

  @Column({ type: 'varchar', length: 50, unique: true })
  handle: string;

  @Column({ type: 'varchar', length: 100 })
  fullname: string;

  @Column({ type: 'date', name: 'date_of_birth', nullable: true })
  dateOfBirth: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatarUrl: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  bio: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website: string;

  @Column({ type: 'varchar', length: 20, default: 'LOCAL' })
  authProvider: string;

  @Column({ type: 'varchar', name: 'fcm_token', nullable: true })
  fcmToken: string;

  @Column({ type: 'varchar', length: 50, default: 'UTC' })
  timezone: string;

  @Column({ type: 'enum', enum: Gender, nullable: true })
  gender: Gender;

  @ManyToMany(() => Role, { eager: true })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Role[];

  @Column({ type: 'bigint', default: 0 })
  points: number;

  @OneToMany(() => SocialAccount, (socialAccount) => socialAccount.user, { cascade: true })
  socialAccounts: SocialAccount[];

  // --- CÁC TRƯỜNG CHO SUBSCRIPTION ---
  @Column({ type: 'enum', enum: AccountType, name: 'account_type', default: AccountType.FREE })
  accountType: AccountType;

  @Column({ type: 'timestamp', name: 'subscription_expiry_date', nullable: true })
  subscriptionExpiryDate: Date;

  // --- CỜ ĐÁNH DẤU HOÀN THÀNH ONBOARDING ---
  @Column({ type: 'boolean', name: 'has_completed_onboarding', default: false })
  hasCompletedOnboarding: boolean;

  @VersionColumn()
  version: number;

  @Column({ type: 'int', name: 'current_streak', default: 0 })
  currentStreak: number;

  @Column({ type: 'timestamp', name: 'last_checkin_at', nullable: true })
  lastCheckinAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Soft Delete tương đương @SQLDelete(sql = "UPDATE users SET deleted_at = CURRENT_TIMESTAMP...")
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;

  /**
   * Logic kiểm tra xem User có phải là VIP và còn hạn sử dụng hay không.
   */
  isPremium(): boolean {
    if (this.accountType !== AccountType.GOLD && this.accountType !== AccountType.PLATINUM) {
      return false;
    }
    return this.subscriptionExpiryDate != null && this.subscriptionExpiryDate.getTime() > new Date().getTime();
  }

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password && !this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
  }
}