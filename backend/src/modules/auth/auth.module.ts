import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

// --- Thêm import cho Throttler (Rate Limiting) ---
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';

// Entities
import { User } from '../user/entities/user.entity';
import { Role } from '../user/entities/role.entity';
import { SocialAccount } from './entities/social-account.entity';
import { MagicLinkToken } from './entities/magic-link.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { UserActivationToken } from './entities/user-activation-token.entity';

// Strategies & Guard
import { JwtStrategy } from './jwt.strategy';
import { GoogleLoginStrategy } from './strategies/social/google-login.strategy';
import { FacebookLoginStrategy } from './strategies/social/facebook-login.strategy';
import { TikTokLoginStrategy } from './strategies/social/tiktok-login.strategy';
import { SocialLoginFactory } from './strategies/social/social-login.factory';

// Services
import { SessionService } from './services/session.service';
import { RegistrationService } from './services/registration.service';
import { AuthService } from './services/auth.service';
import { PasswordService } from './services/password.service';

// Controllers
import { AuthController } from './controllers/auth.controller';
import { RegistrationController } from './controllers/registration.controller';
import { PasswordController } from './controllers/password.controller';
import { SessionController } from './controllers/session.controller';

// Tasks (Hàng đợi gửi mail)
import { EmailProcessor } from './tasks/email.processor';
import Redis from 'ioredis';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User, 
      Role, 
      SocialAccount, 
      MagicLinkToken, 
      PasswordResetToken, 
      UserActivationToken
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'default_secret_key_change_in_production',
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRATION') || '24h',
        },
      }),
    }),
    BullModule.registerQueue({
      name: 'email-tasks',
    }),

    // --- Cấu hình Throttler cho AuthModule ---
ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL') || process.env.REDIS_URL;
        return {
          throttlers: [
            { name: 'otp', ttl: 60000, limit: 1 },
            { name: 'login', ttl: 300000, limit: 5 }
          ],
          // Ép kiểu as any ở đây
          storage: new ThrottlerStorageRedisService(new Redis(redisUrl as string) as any),
        };
      },
    }),
    // ------------------------------------------
  ],
  controllers: [
    AuthController,
    RegistrationController,
    PasswordController,
    SessionController,
  ],
  providers: [
    // Core Auth
    JwtStrategy,
    SessionService,
    RegistrationService,
    AuthService,
    PasswordService,
    // Social Strategies
    GoogleLoginStrategy,
    FacebookLoginStrategy,
    TikTokLoginStrategy,
    SocialLoginFactory,
    // Processors
    EmailProcessor,
  ],
  exports: [JwtModule, PassportModule, TypeOrmModule], 
})
export class AuthModule {}