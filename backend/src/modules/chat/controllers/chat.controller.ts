import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../../jwt-auth.guard';
import { ChatService } from '../services/chat.service';
import { UserPreferenceService } from '../services/user-preference.service';
import { CreateSessionDto, UpdateSessionDto } from '../dto/chat-session.dto';

@Controller('api/v1/chats')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    // THÊM: Inject service cấu hình
    private readonly preferenceService: UserPreferenceService 
  ) {}

  // ==========================================
  // API CẤU HÌNH CÁ NHÂN HÓA (SETTINGS) - Đặt lên trên cùng!
  // ==========================================
  @UseGuards(JwtAuthGuard)
  @Get('user/preferences')
  async getPreferences(@Req() req: any) {
    const data = await this.preferenceService.getPreferences(req.user.userId);
    return { message: 'Lấy cấu hình thành công', data };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('user/preferences')
  async updatePreferences(@Req() req: any, @Body() body: any) {
    const data = await this.preferenceService.updatePreferences(req.user.userId, body);
    return { message: 'Cập nhật cấu hình thành công', data };
  }

  // ==========================================
  // PUBLIC API (Không cần đăng nhập - Dùng cho xem share)
  // ==========================================
  @Get('shared/:token')
  async getSharedSession(@Param('token') token: string) {
    const data = await this.chatService.getSharedSession(token);
    return { message: 'Lấy đoạn chat chia sẻ thành công', data };
  }

  // ==========================================
  // PROTECTED API (Phải đăng nhập)
  // ==========================================
  @UseGuards(JwtAuthGuard)
  @Post()
  async createSession(@Req() req: any, @Body() dto: CreateSessionDto) {
    const session = await this.chatService.createSession(req.user.userId, dto.title);
    return { message: 'Tạo phiên chat mới thành công', data: session };
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getMySessions(@Req() req: any) {
    const sessions = await this.chatService.getUserSessions(req.user.userId);
    return { message: 'Lấy danh sách chat thành công', data: sessions };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/messages')
  async getSessionMessages(@Req() req: any, @Param('id') sessionId: string) {
    const messages = await this.chatService.getSessionMessagesForClient(sessionId, req.user.userId);
    return { message: 'Lấy lịch sử tin nhắn thành công', data: messages };
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async updateSession(@Req() req: any, @Param('id') sessionId: string, @Body() dto: UpdateSessionDto) {
    const session = await this.chatService.updateSessionTitle(sessionId, req.user.userId, dto.title);
    return { message: 'Đổi tên thành công', data: session };
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteSession(@Req() req: any, @Param('id') sessionId: string) {
    await this.chatService.deleteSession(sessionId, req.user.userId);
    return { message: 'Xóa phiên chat thành công' };
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/pin')
  async togglePin(@Req() req: any, @Param('id') sessionId: string, @Body('isPinned') isPinned: boolean) {
    const session = await this.chatService.togglePinSession(sessionId, req.user.userId, isPinned);
    return { message: isPinned ? 'Đã ghim đoạn chat' : 'Đã bỏ ghim đoạn chat', data: session };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/share')
  async shareSession(@Req() req: any, @Param('id') sessionId: string) {
    const token = await this.chatService.shareSession(sessionId, req.user.userId);
    return { message: 'Tạo link chia sẻ thành công', data: { shareToken: token } };
  }

  @UseGuards(JwtAuthGuard)
  @Post('messages/:messageId/rate')
  async rateMessage(
    @Param('messageId') messageId: string, 
    @Body('rating') rating: 'like' | 'dislike' | null
  ) {
    return this.chatService.rateMessage(messageId, rating);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/messages/:messageId/truncate')
  async truncateHistory(@Req() req: any, @Param('id') sessionId: string, @Param('messageId') messageId: string) {
    return this.chatService.truncateChatHistory(sessionId, messageId, req.user.userId);
  }
}