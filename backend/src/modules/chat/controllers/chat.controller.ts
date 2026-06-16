import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../../jwt-auth.guard';
import { ChatService } from '../services/chat.service';
import { CreateSessionDto, UpdateSessionDto } from '../dto/chat-session.dto';

@UseGuards(JwtAuthGuard)
@Controller('api/v1/chats')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async createSession(@Req() req: any, @Body() dto: CreateSessionDto) {
    const session = await this.chatService.createSession(req.user.userId, dto.title);
    return { message: 'Tạo phiên chat mới thành công', data: session };
  }

  @Get()
  async getMySessions(@Req() req: any) {
    const sessions = await this.chatService.getUserSessions(req.user.userId);
    return { message: 'Lấy danh sách chat thành công', data: sessions };
  }

  @Get(':id/messages')
  async getSessionMessages(@Req() req: any, @Param('id') sessionId: string) {
    const messages = await this.chatService.getSessionMessagesForClient(sessionId, req.user.userId);
    return { message: 'Lấy lịch sử tin nhắn thành công', data: messages };
  }

  @Patch(':id')
  async updateSession(@Req() req: any, @Param('id') sessionId: string, @Body() dto: UpdateSessionDto) {
    const session = await this.chatService.updateSessionTitle(sessionId, req.user.userId, dto.title);
    return { message: 'Đổi tên thành công', data: session };
  }

  @Delete(':id')
  async deleteSession(@Req() req: any, @Param('id') sessionId: string) {
    await this.chatService.deleteSession(sessionId, req.user.userId);
    return { message: 'Xóa phiên chat thành công' };
  }
}