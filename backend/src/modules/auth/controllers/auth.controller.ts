import { Controller, Post, Body, Req, Get, Query } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../services/auth.service';
import { 
  LoginRequestDto, 
  SendOtpRequestDto, 
  VerifyOtpLoginDto 
} from '../dto/auth.dto';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // --- TRADITIONAL & OTP LOGIN ---
  @Post('login')
  async login(@Body() dto: LoginRequestDto, @Req() req: Request) {
    const tokens = await this.authService.login(dto, req);
    return { message: 'Đăng nhập thành công', data: tokens };
  }

  @Post('otp/send')
  async sendOtpLogin(@Body() dto: SendOtpRequestDto) {
    await this.authService.sendOtpLogin(dto);
    return { message: 'Mã OTP đăng nhập đã được gửi.' };
  }

  @Post('otp/verify')
  async verifyOtpLogin(@Body() dto: VerifyOtpLoginDto, @Req() req: Request) {
    const tokens = await this.authService.verifyOtpLogin(dto, req);
    return { message: 'Đăng nhập thành công', data: tokens };
  }

  // --- MAGIC LINK ---
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

  // --- SOCIAL LOGIN (Sử dụng Factory Pattern) ---
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