import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { UserEntity } from './user.orm-entity';

/**
 * Token type enum
 */
export enum TokenType {
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  PASSWORD_RESET = 'PASSWORD_RESET',
}

/**
 * Verification Token TypeORM Entity
 *
 * Stores tokens for email verification and password reset.
 * Tokens are single-use and have an expiration time.
 */
@Entity({ name: 'verification_tokens', schema: 'users' })
export class VerificationTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index('idx_verification_tokens_user_id')
  userId!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  @Index('idx_verification_tokens_token')
  token!: string;

  @Column({
    name: 'token_type',
    type: 'varchar',
    length: 50,
  })
  @Index('idx_verification_tokens_type')
  tokenType!: TokenType;

  @Column({ name: 'expires_at', type: 'timestamp' })
  @Index('idx_verification_tokens_expires')
  expiresAt!: Date;

  @Column({ name: 'used_at', type: 'timestamp', nullable: true })
  usedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  /**
   * Check if token is expired
   */
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  /**
   * Check if token has been used
   */
  isUsed(): boolean {
    return this.usedAt !== null;
  }

  /**
   * Check if token is valid (not expired and not used)
   */
  isValid(): boolean {
    return !this.isExpired() && !this.isUsed();
  }
}
