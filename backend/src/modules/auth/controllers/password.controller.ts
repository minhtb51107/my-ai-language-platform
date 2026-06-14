import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { PasswordService } from '../services/password.service';
import { JwtAuthGuard } from '../../../jwt-auth.guard';
import { 
  ForgotPasswordRequestDto, 
  ResetPasswordRequestDto, 
  ChangePasswordDto, 
  CreatePasswordRequestDto 
} from '../dto/password.dto';

@Controller('api/v1/auth/password')
export class PasswordController {
  constructor(private readonly passwordService: PasswordService) {}

  @Post('forgot')
  async forgotPassword(@Body() dto: ForgotPasswordRequestDto) {
    await this.passwordService.forgotPassword(dto);
    return { message: 'Email khôi phục mật khẩu đã được gửi.' };
  }

  @Post('reset')
  async resetPassword(@Body() dto: ResetPasswordRequestDto) {
    await this.passwordService.resetPassword(dto);
    return { message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('change')
  async changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    // req.user được gán từ JwtAuthGuard
    await this.passwordService.changePassword(req.user.userId, dto);
    return { message: 'Đổi mật khẩu thành công.' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('create')
  async createPasswordForSocialUser(@Req() req: any, @Body() dto: CreatePasswordRequestDto) {
    await this.passwordService.createPasswordForSocialUser(req.user.userId, dto);
    return { message: 'Tạo mật khẩu cục bộ thành công.' };
  }
}