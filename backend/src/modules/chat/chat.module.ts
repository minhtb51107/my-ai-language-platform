import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

// Entities
import { ChatSession } from './entities/chat-session.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { UserPreference } from './entities/user-preference.entity';
import { EmotionContext } from './entities/emotion-context.entity';
import { ConversationState } from './entities/conversation-state.entity';
import { User } from '../user/entities/user.entity'; // UserPreferenceService cần Repo của User

// Services & Gateways
import { ChatGateway } from './gateways/chat.gateway';
import { ChatService } from './services/chat.service';
import { EmotionAnalysisService } from './services/emotion-analysis.service';
import { UserPreferenceService } from './services/user-preference.service';
import { ConversationStateService } from './services/conversation-state.service';

// Liên kết các Module khác
import { MemoryModule } from '../memory/memory.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    // Phải đăng ký TẤT CẢ các bảng liên quan đến Chat Domain
    TypeOrmModule.forFeature([
      ChatSession, 
      ChatMessage, 
      UserPreference, 
      EmotionContext, 
      ConversationState,
      User 
    ]),
    JwtModule,
    MemoryModule,
    AiModule,
  ],
  providers: [
    ChatGateway, 
    ChatService,
    EmotionAnalysisService,
    UserPreferenceService,
    ConversationStateService // Đăng ký luôn Service này phòng hờ dùng sau
  ],
  exports: [ChatService],
})
export class ChatModule {}