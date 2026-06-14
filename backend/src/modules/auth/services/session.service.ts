import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';

import { User } from '../../user/entities/user.entity';
import { RedisService } from '../../../core/redis/redis.service';
import { RedisUserSession, UserSessionResponse } from '../dto/redis-session.dto';

@Injectable()
export class SessionService {
  private readonly refreshTokenExpirationMs: number;
  private readonly SESSION_PREFIX = 'session:';
  private readonly USER_SESSIONS_PREFIX = 'user_sessions:';

  constructor(
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {
    // Mặc định 7 ngày cho Refresh Token nếu không có trong env
    this.refreshTokenExpirationMs = this.configService.get<number>('JWT_REFRESH_EXPIRATION_MS') || 604800000;
  }

  async createTokenAndSession(user: User, request: Request): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, role: user.roles?.[0]?.name || 'USER' },
      { expiresIn: this.configService.get<string>('JWT_EXPIRATION') || '24h' }
    );

    // Refresh token dùng UUID cho bảo mật hoặc Jwt tùy chiến lược. Trong MindRevol Java dùng JwtUtil, ở đây ta dùng token JWT riêng cho refresh.
    const refreshToken = this.jwtService.sign(
      { sub: user.id, email: user.email },
      { expiresIn: `${this.refreshTokenExpirationMs}ms` }
    );

    const redisSession: RedisUserSession = {
      id: uuidv4(),
      email: user.email,
      refreshToken: refreshToken,
      ipAddress: request.ip || request.connection.remoteAddress || 'Unknown',
      userAgent: request.headers['user-agent'] || 'Unknown',
      expiredAt: Date.now() + this.refreshTokenExpirationMs,
    };

    const redisClient = this.redisService.getClient();
    const redisKey = `${this.SESSION_PREFIX}${refreshToken}`;
    const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${user.email}`;

    // TTL tính theo giây
    const ttlSeconds = Math.floor(this.refreshTokenExpirationMs / 1000);

    // Lưu phiên bằng Hash/String
    await redisClient.set(redisKey, JSON.stringify(redisSession), 'EX', ttlSeconds);
    // Lưu vào Set quản lý các thiết bị của User
    await redisClient.sadd(userSessionsKey, refreshToken);
    await redisClient.expire(userSessionsKey, ttlSeconds);

    return { accessToken, refreshToken };
  }

  async refreshToken(oldRefreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const redisClient = this.redisService.getClient();
    const redisKey = `${this.SESSION_PREFIX}${oldRefreshToken}`;
    
    const sessionStr = await redisClient.get(redisKey);
    if (!sessionStr) {
      throw new BadRequestException('Invalid or Expired Refresh Token');
    }

    const session: RedisUserSession = JSON.parse(sessionStr);
    const user = await this.userRepository.findOne({ where: { email: session.email }, relations: ['roles'] });
    if (!user) throw new NotFoundException('User not found');

    const newAccessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, role: user.roles?.[0]?.name || 'USER' },
      { expiresIn: this.configService.get<string>('JWT_EXPIRATION') || '24h' }
    );
    const newRefreshToken = this.jwtService.sign(
      { sub: user.id, email: user.email },
      { expiresIn: `${this.refreshTokenExpirationMs}ms` }
    );

    const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${user.email}`;
    const ttlSeconds = Math.floor(this.refreshTokenExpirationMs / 1000);

    // Thu hồi Token cũ
    await redisClient.srem(userSessionsKey, oldRefreshToken);
    await redisClient.del(redisKey);

    // Tạo Token mới (Giữ nguyên Device IP/User Agent)
    const newSession: RedisUserSession = {
      id: uuidv4(),
      email: user.email,
      refreshToken: newRefreshToken,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      expiredAt: Date.now() + this.refreshTokenExpirationMs,
    };

    const newRedisKey = `${this.SESSION_PREFIX}${newRefreshToken}`;
    await redisClient.set(newRedisKey, JSON.stringify(newSession), 'EX', ttlSeconds);
    await redisClient.sadd(userSessionsKey, newRefreshToken);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async logout(refreshToken: string): Promise<void> {
    const redisClient = this.redisService.getClient();
    const redisKey = `${this.SESSION_PREFIX}${refreshToken}`;
    
    const sessionStr = await redisClient.get(redisKey);
    if (sessionStr) {
      const session: RedisUserSession = JSON.parse(sessionStr);
      const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${session.email}`;
      
      await redisClient.srem(userSessionsKey, refreshToken);
      await redisClient.del(redisKey);
    }
  }

  async getAllSessions(userEmail: string, currentTokenRaw: string): Promise<UserSessionResponse[]> {
    const redisClient = this.redisService.getClient();
    const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${userEmail}`;
    const refreshTokens = await redisClient.smembers(userSessionsKey);
    
    const responses: UserSessionResponse[] = [];

    for (const token of refreshTokens) {
      const sessionKey = `${this.SESSION_PREFIX}${token}`;
      const sessionStr = await redisClient.get(sessionKey);

      if (sessionStr) {
        const session: RedisUserSession = JSON.parse(sessionStr);
        responses.push({
          id: session.id,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          expiresAt: new Date(session.expiredAt),
          isCurrent: token === currentTokenRaw // So sánh token để xác định thiết bị hiện tại
        });
      } else {
        // Dọn dẹp rác nếu key không còn
        await redisClient.srem(userSessionsKey, token);
      }
    }
    return responses;
  }

  async revokeSession(sessionId: string, userEmail: string): Promise<void> {
    const redisClient = this.redisService.getClient();
    const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${userEmail}`;
    const refreshTokens = await redisClient.smembers(userSessionsKey);

    for (const token of refreshTokens) {
      const sessionKey = `${this.SESSION_PREFIX}${token}`;
      const sessionStr = await redisClient.get(sessionKey);

      if (sessionStr) {
        const session: RedisUserSession = JSON.parse(sessionStr);
        if (session.id === sessionId) {
          await redisClient.del(sessionKey);
          await redisClient.srem(userSessionsKey, token);
          return;
        }
      }
    }
    throw new NotFoundException('Session not found');
  }
}