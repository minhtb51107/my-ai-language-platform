import { Controller, Post, Get, Body, UseGuards, Req, Delete, Param } from '@nestjs/common';
import { SessionService } from '../services/session.service';
import { JwtAuthGuard } from '../../../jwt-auth.guard';

@Controller('api/v1/auth/session')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post('refresh')
  async refreshToken(@Body('refreshToken') refreshToken: string) {
    const tokens = await this.sessionService.refreshToken(refreshToken);
    return { message: 'Refresh token thành công', data: tokens };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Body('refreshToken') refreshToken: string) {
    await this.sessionService.logout(refreshToken);
    return { message: 'Đăng xuất thành công' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('all')
  async getAllSessions(@Req() req: any, @Body('refreshToken') currentRefreshToken: string) {
    const sessions = await this.sessionService.getAllSessions(req.user.email, currentRefreshToken);
    return { message: 'Lấy danh sách thiết bị thành công', data: sessions };
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':sessionId/revoke')
  async revokeSession(@Req() req: any, @Param('sessionId') sessionId: string) {
    await this.sessionService.revokeSession(sessionId, req.user.email);
    return { message: 'Đã thu hồi phiên đăng nhập trên thiết bị được chọn.' };
  }
}