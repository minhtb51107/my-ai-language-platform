import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcrypt';
import { Request } from 'express';

import { User } from '../../user/entities/user.entity';
import { Role } from '../../user/entities/role.entity';
import { RedisService } from '../../../core/redis/redis.service';
import { SessionService } from './session.service';
import { RegisterRequestDto, VerifyRegisterOtpDto, RegisterTempData } from '../dto/auth.dto';
import { UserStatus, AccountType } from '../../user/user.enums';

@Injectable()
export class RegistrationService {
  private readonly REG_TEMP_PREFIX = 'reg_temp:';
  private readonly REG_TEMP_TTL_SECONDS = 10 * 60; // 10 phút

  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Role) private readonly roleRepository: Repository<Role>,
    private readonly redisService: RedisService,
    private readonly sessionService: SessionService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async registerUserStep1(request: RegisterRequestDto): Promise<void> {
    const emailExists = await this.userRepository.exists({ where: { email: request.email } });
    if (emailExists) throw new BadRequestException('Email đã được sử dụng bởi một tài khoản khác.');

    const handleExists = await this.userRepository.exists({ where: { handle: request.handle } });
    if (handleExists) throw new BadRequestException(`Handle @${request.handle} đã tồn tại.`);

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString(); // Sinh mã 6 số
    const passwordHash = await bcrypt.hash(request.password, 10); // Hash mật khẩu ngay từ bước này

    const tempData: RegisterTempData = {
      fullname: request.fullname,
      email: request.email,
      passwordHash: passwordHash,
      handle: request.handle,
      dateOfBirth: request.dateOfBirth,
      gender: request.gender,
      otpCode: otpCode,
      retryCount: 0,
    };

    const redisKey = `${this.REG_TEMP_PREFIX}${request.email}`;
    await this.redisService.set(redisKey, JSON.stringify(tempData), this.REG_TEMP_TTL_SECONDS);

    // Bắn event để worker/listener gửi email (thay cho AsyncTaskProducer)
    this.eventEmitter.emit('email.send', {
      to: request.email,
      subject: 'Xác thực đăng ký tài khoản MindRevol',
      content: `<p>Mã OTP của bạn là: <b>${otpCode}</b> (Hết hạn sau 10 phút)</p>`,
    });
  }

  async verifyRegisterOtp(request: VerifyRegisterOtpDto, req: Request): Promise<{ accessToken: string; refreshToken: string }> {
    const redisKey = `${this.REG_TEMP_PREFIX}${request.email}`;
    const tempDataStr = await this.redisService.get(redisKey);

    if (!tempDataStr) {
      throw new BadRequestException('Mã xác thực đã hết hạn hoặc email không chính xác. Vui lòng đăng ký lại.');
    }

    const tempData: RegisterTempData = JSON.parse(tempDataStr);

    if (tempData.otpCode !== request.otpCode) {
      tempData.retryCount += 1;
      if (tempData.retryCount > 5) {
        await this.redisService.del(redisKey);
        throw new BadRequestException('Bạn đã nhập sai quá nhiều lần. Phiên đăng ký đã bị hủy.');
      }
      await this.redisService.set(redisKey, JSON.stringify(tempData), this.REG_TEMP_TTL_SECONDS);
      throw new BadRequestException(`Mã OTP không chính xác. Bạn còn ${6 - tempData.retryCount} lần thử.`);
    }

    // Double check handle trước khi thực sự ghi vào DB
    const handleExists = await this.userRepository.exists({ where: { handle: tempData.handle } });
    if (handleExists) throw new BadRequestException(`Rất tiếc, Handle @${tempData.handle} vừa bị đăng ký. Chọn Handle khác.`);

    let userRole = await this.roleRepository.findOne({ where: { name: 'USER' } });
    if (!userRole) {
      userRole = this.roleRepository.create({ name: 'USER', description: 'Default user' });
      userRole = await this.roleRepository.save(userRole);
    }

    const newUser = this.userRepository.create({
      email: tempData.email,
      password: tempData.passwordHash,
      fullname: tempData.fullname,
      handle: tempData.handle,
      dateOfBirth: tempData.dateOfBirth,
      gender: tempData.gender,
      status: UserStatus.ACTIVE,
      accountType: AccountType.FREE,
      authProvider: 'LOCAL',
      roles: [userRole],
    });

    const savedUser = await this.userRepository.save(newUser);
    await this.redisService.del(redisKey);

    // Khởi tạo phiên đăng nhập (JWT)
    return this.sessionService.createTokenAndSession(savedUser, req);
  }

  async resendRegisterOtp(email: string): Promise<void> {
    const redisKey = `${this.REG_TEMP_PREFIX}${email}`;
    const tempDataStr = await this.redisService.get(redisKey);

    if (!tempDataStr) {
      throw new BadRequestException('Phiên đăng ký không tồn tại hoặc đã hết hạn.');
    }

    const tempData: RegisterTempData = JSON.parse(tempDataStr);
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    tempData.otpCode = newOtp;

    await this.redisService.set(redisKey, JSON.stringify(tempData), this.REG_TEMP_TTL_SECONDS);

    this.eventEmitter.emit('email.send', {
      to: email,
      subject: 'Gửi lại mã xác thực - MindRevol',
      content: `<p>Mã xác thực MỚI của bạn là: <b>${newOtp}</b></p>`,
    });
  }
}