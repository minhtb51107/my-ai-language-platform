import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ChatSession } from '../entities/chat-session.entity';
import { ChatMessage } from '../entities/chat-message.entity';
import { MessageRole, SessionStatus } from '../chat.enums';
import { OpenAIService } from '../../ai/llm/openai.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatSession)
    private readonly chatSessionRepo: Repository<ChatSession>,
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepo: Repository<ChatMessage>,
    private readonly openaiService: OpenAIService,
  ) {}

  // ==========================================
  // PHẦN 1: CORE SERVICES (Dùng cho WebSocket & Agent)
  // ==========================================

  /**
   * Lấy và xác thực quyền sở hữu của phiên chat
   */
  async getValidSession(sessionId: string, userId: string): Promise<ChatSession> {
    const session = await this.chatSessionRepo.findOne({ 
      where: { id: sessionId },
      relations: ['user']
    });
    
    if (!session) throw new NotFoundException('Không tìm thấy phiên chat này');
    if (session.user.id !== userId) throw new ForbiddenException('Bạn không có quyền truy cập phiên chat này');
    
    return session;
  }

  /**
   * Lưu tin nhắn vào Database
   */
  async saveMessage(sessionId: string, role: MessageRole, content: string): Promise<ChatMessage> {
    const session = await this.chatSessionRepo.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Không tìm thấy phiên chat này');

    const message = this.chatMessageRepo.create({
      session,
      role,
      content,
    });
    
    // Cập nhật lại thời gian updatedAt của ChatSession để đẩy nó lên đầu danh sách Sidebar
    session.updatedAt = new Date();
    await this.chatSessionRepo.save(session);

    return this.chatMessageRepo.save(message);
  }

  /**
   * Lấy lịch sử hội thoại chuẩn bị ngữ cảnh cho LLM/Agent (Đảo ngược thứ tự)
   */
  async getChatHistory(sessionId: string, limit: number): Promise<any[]> {
    const messages = await this.chatMessageRepo.find({
      where: { session: { id: sessionId } },
      order: { createdAt: 'DESC' },
      take: limit,
    });
    
    return messages.reverse().map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  /**
   * Xử lý luồng chat thô (Dùng cho Controller SSE cũ hoặc fallback)
   */
  async processUserMessage(message: string): Promise<AsyncIterable<string>> {
    return this.openaiService.streamChat([{ role: 'user', content: message }]);
  }

  // ==========================================
  // PHẦN 2: REST API SERVICES (Dùng cho Frontend Web/App)
  // ==========================================

  /**
   * Tạo một phiên chat mới
   */
  async createSession(userId: string, title: string): Promise<ChatSession> {
    const newSession = this.chatSessionRepo.create({
      title,
      user: { id: userId },
      status: SessionStatus.ACTIVE,
    });
    return this.chatSessionRepo.save(newSession);
  }

  /**
   * Lấy danh sách các đoạn chat để hiển thị Sidebar (Mới nhất xếp trên)
   */
  async getUserSessions(userId: string): Promise<ChatSession[]> {
    return this.chatSessionRepo.find({
      where: { user: { id: userId }, status: SessionStatus.ACTIVE },
      order: { updatedAt: 'DESC' }, 
    });
  }

  /**
   * Lấy toàn bộ lịch sử tin nhắn của một phiên chat cho Frontend render
   */
  async getSessionMessagesForClient(sessionId: string, userId: string): Promise<ChatMessage[]> {
    // 1. Kiểm tra xem user có phải chủ sở hữu không
    await this.getValidSession(sessionId, userId);
    
    // 2. Trả về toàn bộ tin nhắn theo thứ tự thời gian tăng dần
    return this.chatMessageRepo.find({
      where: { session: { id: sessionId } },
      order: { createdAt: 'ASC' }, 
    });
  }

  /**
   * Đổi tên tiêu đề của đoạn chat
   */
  async updateSessionTitle(sessionId: string, userId: string, newTitle: string): Promise<ChatSession> {
    const session = await this.getValidSession(sessionId, userId);
    session.title = newTitle;
    return this.chatSessionRepo.save(session);
  }

  /**
   * Xóa hoàn toàn một phiên chat (Xóa cứng)
   */
  async deleteSession(sessionId: string, userId: string): Promise<void> {
    const session = await this.getValidSession(sessionId, userId);
    // Tính năng cascade on delete sẽ tự động xóa các ChatMessage liên quan
    await this.chatSessionRepo.remove(session);
  }
}