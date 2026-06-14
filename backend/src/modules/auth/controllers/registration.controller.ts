import { Controller, Post, Body, Req } from '@nestjs/common';
import { Request } from 'express';
import { RegistrationService } from '../services/registration.service';
import { RegisterRequestDto, VerifyRegisterOtpDto } from '../dto/auth.dto';

@Controller('api/v1/auth/register')
export class RegistrationController {
  constructor(private readonly registrationService: RegistrationService) {}

  @Post('step1')
  async registerStep1(@Body() dto: RegisterRequestDto) {
    await this.registrationService.registerUserStep1(dto);
    return { message: 'Mã OTP đã được gửi đến email của bạn.' };
  }

  @Post('verify')
  async verifyRegister(@Body() dto: VerifyRegisterOtpDto, @Req() req: Request) {
    const tokens = await this.registrationService.verifyRegisterOtp(dto, req);
    return { message: 'Đăng ký thành công', data: tokens };
  }

  @Post('resend')
  async resendRegisterOtp(@Body('email') email: string) {
    await this.registrationService.resendRegisterOtp(email);
    return { message: 'Mã OTP mới đã được gửi.' };
  }
}