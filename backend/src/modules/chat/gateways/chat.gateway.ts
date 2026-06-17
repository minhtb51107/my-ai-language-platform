import { 
  WebSocketGateway, 
  SubscribeMessage, 
  MessageBody, 
  ConnectedSocket, 
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { ChatMessageDto } from '../dto/chat.dto';
import { ChatService } from '../services/chat.service';
import { AgentService } from '../../ai/agents/agent.service';
import { EmotionAnalysisService } from '../services/emotion-analysis.service';
import { UserPreferenceService } from '../services/user-preference.service';
import { ContextCompactionService } from '../services/context-compaction.service';
import { ConversationStateService } from '../services/conversation-state.service';
import { MemorySummaryManager } from '../../memory/services/memory-summary.manager';
import { MessageRole } from '../chat.enums';

@Injectable()
@WebSocketGateway({
  namespace: '/api/v1/chat-stream',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly agentService: AgentService,
    private readonly emotionService: EmotionAnalysisService,
    private readonly preferenceService: UserPreferenceService,
    private readonly compactionService: ContextCompactionService, // Nhúng Compaction
    private readonly conversationStateService: ConversationStateService, // Nhúng State
    private readonly memorySummaryManager: MemorySummaryManager, // Nhúng Memory Summary
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.query.token;
      if (!token) throw new Error('Không tìm thấy Token trong handshake');

      const secret = 
        this.configService.get<string>('JWT_SECRET') || 
        this.configService.get<string>('JWT_ACCESS_SECRET') || 
        process.env.JWT_SECRET || 
        process.env.JWT_ACCESS_SECRET;

      if (!secret) {
        this.logger.error('CẢNH BÁO CRITICAL: Không tìm thấy JWT Secret trong biến môi trường!');
        throw new Error('Server thiếu cấu hình JWT Secret');
      }

      const payload = this.jwtService.verify(token, { secret });
      client.data.userId = payload.sub || payload.id || payload.userId; 
      
      this.logger.log(`🔗 User connected thành công: ${client.data.userId} (SocketID: ${client.id})`);
    } catch (error: any) {
      this.logger.warn(`Từ chối kết nối WebSocket: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`❌ Client disconnected: ${client.id}`);
  }

  @UsePipes(new ValidationPipe({ transform: true }))
  @SubscribeMessage('sendMessage')
  async handleMessage(@MessageBody() payload: ChatMessageDto, @ConnectedSocket() client: Socket) {
    const { sessionId, message } = payload;
    const userId = client.data.userId;

    client.emit('aiTyping', { sessionId, isTyping: true });

    try {
      const session = await this.chatService.getValidSession(sessionId, userId);
      await this.chatService.saveMessage(sessionId, MessageRole.USER, message);

      // 1. Lấy lịch sử chat (Lấy nhiều hơn vì đã có Compaction lo phần nén)
      let chatHistory = await this.chatService.getChatHistory(sessionId, 20);

      // 2. ⚡ COMPACTION: Nén ngữ cảnh nếu vượt quá 6000 tokens
      chatHistory = await this.compactionService.optimizeAndCompactContext(chatHistory, 'gpt-4o-mini');

      // 3. Phân tích ngữ cảnh song song
      const [emotionContext, userPreferences, convoState] = await Promise.all([
        this.emotionService.analyzeEmotion(message),
        this.preferenceService.getUserPreferencesForPrompt(userId),
        this.conversationStateService.getOrCreateState(sessionId)
      ]);

      // 4. Theo dõi mức độ thất vọng (Frustration) dựa trên cảm xúc của User
      if (emotionContext.currentEmotion === 'angry') {
        await this.conversationStateService.adjustFrustrationLevel(sessionId, 2);
      } else if (emotionContext.currentEmotion === 'happy' || emotionContext.currentEmotion === 'excited') {
        await this.conversationStateService.adjustFrustrationLevel(sessionId, -1);
      }

      // 5. Giao việc cho AgentService và bơm Ngữ cảnh
      const fullAiResponse = await this.agentService.processMessage(
        userId,
        sessionId,
        message,
        chatHistory,
        { emotion: emotionContext.currentEmotion, preferences: userPreferences },
        {
          onStatus: (status) => client.emit('agentStatus', { sessionId, status }),
          onChunk: (chunk) => client.emit('messageChunk', { sessionId, chunk }),
        }
      );

      client.emit('messageComplete', { sessionId, fullMessage: fullAiResponse });
      await this.chatService.saveMessage(sessionId, MessageRole.ASSISTANT, fullAiResponse);

      // 6. ⚡ CHẠY NGẦM (Fire-and-forget): Các tác vụ sau không chặn response của user
      setImmediate(async () => {
        try {
          // A. Cập nhật sở thích học viên (Implicit feedback)
          await this.preferenceService.detectAndUpdatePreferences(userId, message, fullAiResponse);
          
          // B. Xóa cờ needsClarification nếu đang có
          if (convoState.needsClarification) {
            await this.conversationStateService.clearClarification(sessionId);
          }

          // C. KÍCH HOẠT TRÍ NHỚ DÀI HẠN (Long-term Memory)
          const recentMessages = await this.chatService.getSessionMessagesForClient(sessionId, userId);
          const shouldUpdate = await this.memorySummaryManager.shouldUpdateMemory(session, recentMessages);
          if (shouldUpdate) {
            await this.memorySummaryManager.updateSummary(session, recentMessages);
            this.logger.log(`🧠 Đã cập nhật Long-term Memory cho Session ${sessionId}`);
          }

        } catch (e) {
          this.logger.error('Lỗi khi chạy background tasks sau chat', e);
        }
      });

    } catch (error: any) {
      if (error.status === 400) {
        client.emit('chatError', { sessionId, error: error.message });
      } else {
        this.logger.error(`Chat stream error cho session ${sessionId}`, error.stack);
        client.emit('chatError', { sessionId, error: 'Hệ thống AI đang bận hoặc có lỗi. Vui lòng thử lại.' });
      }
    } finally {
      client.emit('aiTyping', { sessionId, isTyping: false });
    }
  }
}