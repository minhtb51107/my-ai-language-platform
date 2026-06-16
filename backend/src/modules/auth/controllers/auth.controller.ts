import { Controller, Post, Body, Req, Get, Query, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { AuthService } from '../services/auth.service';
import { LoginRequestDto, SendOtpRequestDto, VerifyOtpLoginDto } from '../dto/auth.dto';

// Áp dụng Guard cho toàn bộ Controller
@UseGuards(ThrottlerGuard)
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ login: { limit: 5, ttl: 300000 } }) // 5 lần / 5 phút
  @Post('login')
  async login(@Body() dto: LoginRequestDto, @Req() req: Request) {
    const tokens = await this.authService.login(dto, req);
    return { message: 'Đăng nhập thành công', data: tokens };
  }

  @Throttle({ otp: { limit: 1, ttl: 60000 } }) // 1 lần / 60 giây
  @Post('otp/send')
  async sendOtpLogin(@Body() dto: SendOtpRequestDto) {
    await this.authService.sendOtpLogin(dto);
    return { message: 'Mã OTP đăng nhập đã được gửi.' };
  }

  @Throttle({ login: { limit: 5, ttl: 300000 } })
  @Post('otp/verify')
  async verifyOtpLogin(@Body() dto: VerifyOtpLoginDto, @Req() req: Request) {
    const tokens = await this.authService.verifyOtpLogin(dto, req);
    return { message: 'Đăng nhập thành công', data: tokens };
  }

  // ... (giữ nguyên các endpoint Magic Link và Social Login)
  @Post('magic-link/send')
  async sendMagicLink(@Body('email') email: string) {
    await this.authService.sendMagicLink(email);
    return { message: 'Magic link đã được gửi tới email của bạn.' };
  }

  @Get('magic-link/verify')
  async verifyMagicLink(@Query('token') token: string, @Req() req: Request) {
    const tokens = await this.authService.loginWithMagicLink(token, req);
    return { message: 'Đăng nhập thành công', data: tokens };
  }

  @Post('social/google')
  async loginWithGoogle(@Body() requestData: any, @Req() req: Request) {
    const tokens = await this.authService.processUnifiedSocialLogin('google', requestData, req);
    return { message: 'Đăng nhập Google thành công', data: tokens };
  }

  @Post('social/facebook')
  async loginWithFacebook(@Body() requestData: any, @Req() req: Request) {
    const tokens = await this.authService.processUnifiedSocialLogin('facebook', requestData, req);
    return { message: 'Đăng nhập Facebook thành công', data: tokens };
  }

  @Post('social/tiktok')
  async loginWithTikTok(@Body() requestData: any, @Req() req: Request) {
    const tokens = await this.authService.processUnifiedSocialLogin('tiktok', requestData, req);
    return { message: 'Đăng nhập TikTok thành công', data: tokens };
  }
}