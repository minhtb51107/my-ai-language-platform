import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import { User } from '../../user/entities/user.entity';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { 
  ChangePasswordDto, 
  ForgotPasswordRequestDto, 
  ResetPasswordRequestDto,
  CreatePasswordRequestDto
} from '../dto/password.dto';

@Injectable()
export class PasswordService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(PasswordResetToken) private readonly passwordResetTokenRepo: Repository<PasswordResetToken>,
    @InjectQueue('email-tasks') private readonly emailQueue: Queue,
  ) {}

  async forgotPassword(request: ForgotPasswordRequestDto): Promise<void> {
    const user = await this.userRepository.findOne({ where: { email: request.email } });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản với email này.');

    await this.passwordResetTokenRepo.delete({ user: { id: user.id } });

    const resetToken = this.passwordResetTokenRepo.create({
      user,
      token: uuidv4(),
      expiryDate: new Date(Date.now() + 15 * 60 * 1000) 
    });
    await this.passwordResetTokenRepo.save(resetToken);

    const resetLink = `http://localhost:5173/reset-password?token=${resetToken.token}`;
    
    await this.emailQueue.add('send-email', {
      to: user.email,
      subject: 'Yêu cầu đặt lại mật khẩu - MindRevol',
      content: `<p>Nhấp vào link để đặt lại mật khẩu (hiệu lực 15 phút): <a href="${resetLink}">${resetLink}</a></p>`,
    }, { attempts: 3, backoff: 5000 });
  }

  async resetPassword(request: ResetPasswordRequestDto): Promise<void> {
    const resetToken = await this.passwordResetTokenRepo.findOne({ 
      where: { token: request.token },
      relations: ['user']
    });

    if (!resetToken) throw new BadRequestException('Token không hợp lệ hoặc không tồn tại.');
    if (resetToken.isExpired()) {
      await this.passwordResetTokenRepo.remove(resetToken);
      throw new BadRequestException('Token đã hết hạn. Vui lòng yêu cầu lại.');
    }

    const user = resetToken.user;
    user.password = await bcrypt.hash(request.newPassword, 10);
    await this.userRepository.save(user);
    
    await this.passwordResetTokenRepo.remove(resetToken);
  }

  async changePassword(userId: string, request: ChangePasswordDto): Promise<void> {
    const user = await this.userRepository.createQueryBuilder('user')
      .where('user.id = :id', { id: userId })
      .addSelect('user.password')
      .getOne();

    if (!user) throw new NotFoundException('User not found');
    
    if (user.authProvider !== 'LOCAL') {
      throw new BadRequestException('Tài khoản mạng xã hội không thể đổi mật khẩu theo cách này.');
    }

    const isMatch = await bcrypt.compare(request.oldPassword, user.password || '');
    if (!isMatch) throw new BadRequestException('Mật khẩu cũ không chính xác.');

    user.password = await bcrypt.hash(request.newPassword, 10);
    await this.userRepository.save(user);
  }

  async createPasswordForSocialUser(userId: string, request: CreatePasswordRequestDto): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.authProvider === 'LOCAL') {
      throw new BadRequestException('Tài khoản này đã có mật khẩu cục bộ.');
    }

    user.password = await bcrypt.hash(request.newPassword, 10);
    user.authProvider = 'LOCAL'; 
    await this.userRepository.save(user);
  }
}