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
import { MessageRole } from '../chat.enums';

@Injectable()
@WebSocketGateway({ cors: { origin: '*' }, namespace: '/api/v1/chat-stream' })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly agentService: AgentService,
    private readonly emotionService: EmotionAnalysisService,
    private readonly preferenceService: UserPreferenceService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.query.token;
      if (!token) throw new Error('No token provided');

      const secret = this.configService.get<string>('JWT_SECRET');
      const payload = this.jwtService.verify(token, { secret });
      
      client.data.userId = payload.sub; 
      this.logger.log(`🔗 User connected: ${payload.sub} (SocketID: ${client.id})`);
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
      await this.chatService.getValidSession(sessionId, userId);
      await this.chatService.saveMessage(sessionId, MessageRole.USER, message);

      const chatHistory = await this.chatService.getChatHistory(sessionId, 10);

      // ⚡ TỐI ƯU HÓA: Phân tích cảm xúc và sở thích CHẠY SONG SONG
      const [emotionContext, userPreferences] = await Promise.all([
        this.emotionService.analyzeEmotion(message),
        this.preferenceService.getUserPreferencesForPrompt(userId)
      ]);

      // Giao việc cho AgentService và bơm Ngữ cảnh cá nhân hóa vào
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

      // ⚡ CHẠY NGẦM: Cập nhật sở thích học viên từ câu trả lời mới nhất (Fire and Forget)
      this.preferenceService.detectAndUpdatePreferences(userId, message, fullAiResponse).catch(e => {
        this.logger.error('Lỗi khi cập nhật sở thích chạy ngầm', e);
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