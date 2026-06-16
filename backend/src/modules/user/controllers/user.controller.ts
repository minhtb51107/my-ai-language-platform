import { Controller, Get, Put, Body, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../../jwt-auth.guard';
import { UserService } from '../services/user.service';
import { UpdateProfileDto } from '../dto/user.dto';

@UseGuards(JwtAuthGuard) // Bảo vệ toàn bộ endpoint
@Controller('api/v1/users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  async getMyProfile(@Req() req: any) {
    const user = await this.userService.getUserProfile(req.user.userId);
    return { message: 'Lấy thông tin thành công', data: user };
  }

  @Put('me')
  async updateMyProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    const updatedUser = await this.userService.updateProfile(req.user.userId, dto);
    return { message: 'Cập nhật hồ sơ thành công', data: updatedUser };
  }
}