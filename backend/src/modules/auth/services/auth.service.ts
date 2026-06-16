import { Injectable, BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';

import { User } from '../../user/entities/user.entity';
import { Role } from '../../user/entities/role.entity';
import { SocialAccount } from '../entities/social-account.entity';
import { MagicLinkToken } from '../entities/magic-link.entity';
import { RedisService } from '../../../core/redis/redis.service';
import { SessionService } from './session.service';
import { SocialLoginFactory } from '../strategies/social/social-login.factory';
import { SocialProviderData } from '../strategies/social/social-login.interface';
import { LoginRequestDto, SendOtpRequestDto, VerifyOtpLoginDto } from '../dto/auth.dto';
import { UserStatus, AccountType } from '../../user/user.enums';

@Injectable()
export class AuthService {
  private readonly OTP_PREFIX = 'auth:otp:code:';
  private readonly OTP_RETRY_PREFIX = 'auth:otp:retry:';

  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Role) private readonly roleRepository: Repository<Role>,
    @InjectRepository(SocialAccount) private readonly socialAccountRepo: Repository<SocialAccount>,
    @InjectRepository(MagicLinkToken) private readonly magicLinkTokenRepo: Repository<MagicLinkToken>,
    private readonly redisService: RedisService,
    private readonly sessionService: SessionService,
    private readonly socialLoginFactory: SocialLoginFactory,
    @InjectQueue('email-tasks') private readonly emailQueue: Queue,
  ) {}

  async login(request: LoginRequestDto, req: Request) {
    const user = await this.userRepository.createQueryBuilder('user')
      .where('user.email = :email', { email: request.email })
      .addSelect('user.password')
      .leftJoinAndSelect('user.roles', 'roles')
      .getOne();

    if (!user) throw new NotFoundException('Tài khoản không tồn tại');
    if (user.status !== UserStatus.ACTIVE) throw new UnauthorizedException('Tài khoản bị khóa hoặc chưa kích hoạt.');

    const isMatch = await bcrypt.compare(request.password, user.password || '');
    if (!isMatch) throw new UnauthorizedException('Sai email hoặc mật khẩu');

    return this.sessionService.createTokenAndSession(user, req);
  }

  async sendOtpLogin(request: SendOtpRequestDto): Promise<void> {
    const user = await this.userRepository.findOne({ where: { email: request.email } });
    if (!user) throw new NotFoundException('Email này chưa đăng ký tài khoản.');

    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    const redisClient = this.redisService.getClient();
    
    await redisClient.set(`${this.OTP_PREFIX}${request.email}`, newCode, 'EX', 300); 
    await redisClient.del(`${this.OTP_RETRY_PREFIX}${request.email}`);

    // Đẩy task gửi mail vào BullMQ
    await this.emailQueue.add('send-email', {
      to: user.email,
      subject: 'Mã xác thực đăng nhập MindRevol',
      content: `<h1>Mã OTP của bạn: ${newCode}</h1><p>Hết hạn sau 5 phút.</p>`,
    }, { attempts: 3, backoff: 5000 });
  }

  async verifyOtpLogin(request: VerifyOtpLoginDto, req: Request) {
    const user = await this.userRepository.findOne({ where: { email: request.email }, relations: ['roles'] });
    if (!user) throw new NotFoundException('User not found');

    const otpKey = `${this.OTP_PREFIX}${request.email}`;
    const retryKey = `${this.OTP_RETRY_PREFIX}${request.email}`;
    const redisClient = this.redisService.getClient();

    const cachedOtp = await redisClient.get(otpKey);
    if (!cachedOtp) throw new BadRequestException('Mã OTP đã hết hạn hoặc chưa được gửi.');

    let retryCount = parseInt(await redisClient.get(retryKey) || '0', 10);
    if (retryCount >= 5) {
      await redisClient.del(otpKey, retryKey);
      throw new BadRequestException('Bạn nhập sai quá 5 lần. Vui lòng yêu cầu mã mới.');
    }

    if (cachedOtp !== request.otpCode) {
      await redisClient.incr(retryKey);
      await redisClient.expire(retryKey, 300);
      throw new BadRequestException(`Mã OTP không chính xác. (Sai ${retryCount + 1}/5 lần)`);
    }

    await redisClient.del(otpKey, retryKey);
    return this.sessionService.createTokenAndSession(user, req);
  }

  async sendMagicLink(email: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) throw new NotFoundException('Email chưa đăng ký');

    const magicToken = MagicLinkToken.create(user);
    await this.magicLinkTokenRepo.save(magicToken);

    const link = `http://localhost:5173/magic-login?token=${magicToken.token}`;
    
    await this.emailQueue.add('send-email', {
      to: user.email,
      subject: 'Đăng nhập MindRevol bằng Magic Link',
      content: `<p>Nhấp vào link sau để đăng nhập: <a href="${link}">${link}</a></p>`,
    }, { attempts: 3, backoff: 5000 });
  }

  async loginWithMagicLink(token: string, req: Request) {
    const magicToken = await this.magicLinkTokenRepo.findOne({ 
      where: { token }, 
      relations: ['user', 'user.roles'] 
    });

    if (!magicToken) throw new BadRequestException('Link không hợp lệ');
    if (magicToken.isExpired()) {
      await this.magicLinkTokenRepo.remove(magicToken);
      throw new BadRequestException('Link đã hết hạn');
    }

    await this.magicLinkTokenRepo.remove(magicToken);
    return this.sessionService.createTokenAndSession(magicToken.user, req);
  }

  async processUnifiedSocialLogin(providerName: string, requestData: any, req: Request) {
    const strategy = this.socialLoginFactory.getStrategy(providerName);
    const data = await strategy.verifyAndGetData(requestData);
    const user = await this.findOrCreateUser(providerName, data);
    return this.sessionService.createTokenAndSession(user, req);
  }

  private async findOrCreateUser(provider: string, data: SocialProviderData): Promise<User> {
    const existingLink = await this.socialAccountRepo.findOne({
      where: { provider, providerId: data.providerId },
      relations: ['user', 'user.roles']
    });

    if (existingLink) return existingLink.user;

    let user: User | null = null;
    if (data.email) {
      user = await this.userRepository.findOne({ where: { email: data.email }, relations: ['roles'] });
    }

    if (!user) {
      user = await this.createNewSocialUser(data.email, data.name, data.avatarUrl);
    }

    const newLink = this.socialAccountRepo.create({
      user,
      provider,
      providerId: data.providerId,
      email: data.email,
      avatarUrl: data.avatarUrl
    });
    await this.socialAccountRepo.save(newLink);

    return user;
  }

  private async createNewSocialUser(email?: string, name?: string, avatarUrl?: string): Promise<User> {
    const safeEmail = email || `no-email-${uuidv4()}@mindrevol.local`;
    let baseHandle = safeEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
    if (!baseHandle) baseHandle = 'user';

    let handle = baseHandle;
    let suffix = 1;
    while (await this.userRepository.exists({ where: { handle } })) {
      handle = `${baseHandle}.${++suffix}`;
    }

    let userRole = await this.roleRepository.findOne({ where: { name: 'USER' } });
    if (!userRole) {
      userRole = await this.roleRepository.save(this.roleRepository.create({ name: 'USER', description: 'Default' }));
    }

    const dummyPassword = await bcrypt.hash(uuidv4(), 10);

    const newUser = this.userRepository.create({
      email: safeEmail,
      fullname: name || 'New User',
      avatarUrl,
      handle,
      password: dummyPassword,
      status: UserStatus.ACTIVE,
      accountType: AccountType.FREE,
      authProvider: 'SOCIAL',
      roles: [userRole]
    });

    return this.userRepository.save(newUser);
  }
}