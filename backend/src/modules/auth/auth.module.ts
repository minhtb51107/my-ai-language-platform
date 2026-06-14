import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

// 1. Entities
import { User } from '../user/entities/user.entity';
import { Role } from '../user/entities/role.entity';
import { SocialAccount } from './entities/social-account.entity';
import { MagicLinkToken } from './entities/magic-link.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { UserActivationToken } from './entities/user-activation-token.entity';

// 2. Strategies & Guard
import { JwtStrategy } from './jwt.strategy';
import { GoogleLoginStrategy } from './strategies/social/google-login.strategy';
import { FacebookLoginStrategy } from './strategies/social/facebook-login.strategy';
import { TikTokLoginStrategy } from './strategies/social/tiktok-login.strategy';
import { SocialLoginFactory } from './strategies/social/social-login.factory';

// 3. Services
import { SessionService } from './services/session.service';
import { RegistrationService } from './services/registration.service';
import { AuthService } from './services/auth.service';
import { PasswordService } from './services/password.service';

// 4. Controllers
import { AuthController } from './controllers/auth.controller';
import { RegistrationController } from './controllers/registration.controller';
import { PasswordController } from './controllers/password.controller';
import { SessionController } from './controllers/session.controller';

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
  ],
  exports: [JwtModule, PassportModule, TypeOrmModule], 
})
export class AuthModule {}