import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { ChatSession } from '../entities/chat-session.entity';
import { ChatMessage } from '../entities/chat-message.entity';
import { MessageRole, SessionStatus } from '../chat.enums';
import { OpenAIService } from '../../ai/llm/openai.service';
import { ContextCompactionService } from './context-compaction.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(ChatSession)
    private readonly chatSessionRepo: Repository<ChatSession>,
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepo: Repository<ChatMessage>,
    private readonly openaiService: OpenAIService,
    private readonly compactionService: ContextCompactionService, // Inject Service nén
  ) {}

  async getValidSession(sessionId: string, userId: string): Promise<ChatSession> {
    const session = await this.chatSessionRepo.findOne({ 
      where: { id: sessionId },
      relations: ['user']
    });
    
    if (!session) throw new NotFoundException('Không tìm thấy phiên chat này');
    if (session.user.id !== userId) throw new ForbiddenException('Bạn không có quyền truy cập');
    
    return session;
  }

  async saveMessage(sessionId: string, role: MessageRole, content: string, attachments?: any[]): Promise<ChatMessage> {
    const session = await this.chatSessionRepo.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Không tìm thấy phiên chat');

    const message = this.chatMessageRepo.create({ 
      session, role, content: content || '', attachments: attachments || [] 
    });
    
    session.updatedAt = new Date();
    await this.chatSessionRepo.save(session);
    const savedMsg = await this.chatMessageRepo.save(message);

    // KÍCH HOẠT AUTO-SUMMARIZE NGẦM (Không await để không chặn luồng phản hồi)
    this.checkAndSummarizeHistory(sessionId).catch(e => this.logger.error('Lỗi Auto-Summarize', e));

    return savedMsg;
  }

  private async checkAndSummarizeHistory(sessionId: string) {
    const count = await this.chatMessageRepo.count({ where: { session: { id: sessionId } } });
    
    // Đạt ngưỡng 20 tin nhắn thì gom 15 tin cũ nhất đi tóm tắt
    if (count > 20) {
      const messages = await this.chatMessageRepo.find({ 
        where: { session: { id: sessionId } }, 
        order: { created_at: 'ASC' } 
      });

      const messagesToCompact = messages.slice(0, 15);
      const summaryContent = await this.compactionService.optimizeAndCompactContext(messagesToCompact, 'gpt-4o-mini');
      
      const summaryText = summaryContent.map(m => m.content).join('\n');

      const oldMessageIds = messagesToCompact.map(m => m.id);
      await this.chatMessageRepo.delete(oldMessageIds);

      const summaryMessage = this.chatMessageRepo.create({
        session: { id: sessionId },
        role: MessageRole.SYSTEM,
        content: `[TÓM TẮT LỊCH SỬ TRƯỚC ĐÓ - ĐÃ ĐƯỢC AI NÉN LẠI]:\n${summaryText}`
      });
      await this.chatMessageRepo.save(summaryMessage);
      this.logger.log(`Đã nén thành công ${oldMessageIds.length} tin nhắn cũ của session ${sessionId}`);
    }
  }

  async getChatHistory(sessionId: string, limit: number): Promise<any[]> {
    const messages = await this.chatMessageRepo.find({
      where: { session: { id: sessionId } },
      order: { created_at: 'DESC' },
      take: limit,
    });
    return messages.reverse().map(msg => ({ role: msg.role, content: msg.content, attachments: msg.attachments }));
  }

  async createSession(userId: string, title: string): Promise<ChatSession> {
    const newSession = this.chatSessionRepo.create({ title, user: { id: userId }, status: SessionStatus.ACTIVE });
    return this.chatSessionRepo.save(newSession);
  }

  async getUserSessions(userId: string): Promise<ChatSession[]> {
    return this.chatSessionRepo.find({
      where: { user: { id: userId }, status: SessionStatus.ACTIVE },
      order: { isPinned: 'DESC', updatedAt: 'DESC' }, 
    });
  }

  async getSessionMessagesForClient(sessionId: string, userId: string): Promise<ChatMessage[]> {
    await this.getValidSession(sessionId, userId);
    return this.chatMessageRepo.find({ where: { session: { id: sessionId } }, order: { created_at: 'ASC' } });
  }

  async updateSessionTitle(sessionId: string, userId: string, newTitle: string) {
    const session = await this.getValidSession(sessionId, userId);
    session.title = newTitle;
    return this.chatSessionRepo.save(session);
  }

  async deleteSession(sessionId: string, userId: string) {
    const session = await this.getValidSession(sessionId, userId);
    await this.chatSessionRepo.remove(session); 
  }

  async togglePinSession(sessionId: string, userId: string, isPinned: boolean) {
    const session = await this.getValidSession(sessionId, userId);
    session.isPinned = isPinned;
    return this.chatSessionRepo.save(session);
  }

  async shareSession(sessionId: string, userId: string) {
    const session = await this.getValidSession(sessionId, userId);
    if (!session.shareToken) {
      session.shareToken = uuidv4().replace(/-/g, '').substring(0, 12); 
      await this.chatSessionRepo.save(session);
    }
    return session.shareToken;
  }

  async getSharedSession(shareToken: string) {
    const session = await this.chatSessionRepo.findOne({
      where: { shareToken, status: SessionStatus.ACTIVE },
      relations: ['user']
    });
    if (!session) throw new NotFoundException('Đoạn chat không tồn tại hoặc đã bị tắt chia sẻ');
    
    const messages = await this.chatMessageRepo.find({
      where: { session: { id: session.id } },
      order: { created_at: 'ASC' } 
    });

    return {
      sessionInfo: { title: session.title, ownerName: session.user.fullname, createdAt: session.createdAt },
      messages
    };
  }

  async rateMessage(messageId: string, rating: 'like' | 'dislike' | null) {
    const message = await this.chatMessageRepo.findOne({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Không tìm thấy tin nhắn');
    message.rating = rating;
    return this.chatMessageRepo.save(message);
  }

  async truncateChatHistory(sessionId: string, messageId: string, userId: string) {
    const session = await this.getValidSession(sessionId, userId);
    const targetMsg = await this.chatMessageRepo.findOne({ where: { id: messageId, session: { id: sessionId } } });
    
    if (!targetMsg) throw new NotFoundException('Tin nhắn gốc không tồn tại');

    // Tìm các tin nhắn sắp bị cắt
    const messagesToArchive = await this.chatMessageRepo.find({
      where: { 
        session: { id: sessionId },
        created_at: MoreThanOrEqual(targetMsg.created_at)
      }
    });

    // Lưu mảng bị cắt vào metadata của session (như một nhánh backup)
    const branchData = messagesToArchive.map(m => `[${m.role}] ${m.content}`).join('\n---\n');
    session.metadata = {
      ...session.metadata,
      archivedBranches: [...(session.metadata?.archivedBranches || []), branchData]
    };
    await this.chatSessionRepo.save(session);

    // Xóa các tin nhắn khỏi trục chính
    await this.chatMessageRepo.delete(messagesToArchive.map(m => m.id));

    return { success: true, message: 'Đã lưu nhánh và rẽ nhánh thành công' };
  }
}