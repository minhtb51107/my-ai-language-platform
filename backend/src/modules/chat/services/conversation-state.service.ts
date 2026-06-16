import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConversationState } from '../entities/conversation-state.entity';
import { ChatSession } from '../entities/chat-session.entity';
import { ConversationStage } from '../enums/conversation-stage.enum';

@Injectable()
export class ConversationStateService {
  constructor(
    @InjectRepository(ConversationState)
    private readonly stateRepo: Repository<ConversationState>,
    @InjectRepository(ChatSession)
    private readonly chatSessionRepo: Repository<ChatSession>,
  ) {}

  async getOrCreateState(sessionId: string): Promise<ConversationState> {
    let state = await this.stateRepo.findOne({ where: { chatSession: { id: sessionId } }, relations: ['chatSession'] });
    if (!state) {
      state = await this.createInitialState(sessionId);
    }
    return state;
  }

  async updateState(sessionId: string, newStage: string, newTopic: string): Promise<void> {
    const state = await this.getOrCreateState(sessionId);

    if (!state.stateHistory) {
      state.stateHistory = [];
    }
    
    state.stateHistory.push(state.conversationStage);
    state.conversationStage = newStage;
    state.currentTopic = newTopic;
    state.lastStateChange = new Date();

    await this.stateRepo.save(state);
  }

  async markNeedsClarification(sessionId: string, question: string): Promise<void> {
    const state = await this.getOrCreateState(sessionId);
    state.needsClarification = true;
    state.pendingQuestion = question;
    await this.stateRepo.save(state);
  }

  // Replace ONLY this method
  async clearClarification(sessionId: string): Promise<void> {
    const state = await this.getOrCreateState(sessionId);
    state.needsClarification = false;
    state.pendingQuestion = ''; // Assign empty string instead of null to fix TS2322
    await this.stateRepo.save(state);
  }

  async adjustFrustrationLevel(sessionId: string, delta: number): Promise<void> {
    const state = await this.getOrCreateState(sessionId);
    const newLevel = Math.min(Math.max(state.frustrationLevel + delta, 0), 10);
    state.frustrationLevel = newLevel;
    await this.stateRepo.save(state);
  }

  private async createInitialState(sessionId: string): Promise<ConversationState> {
    const chatSession = await this.chatSessionRepo.findOne({ where: { id: sessionId } });
    if (!chatSession) throw new NotFoundException(`ChatSession not found with id: ${sessionId}`);

    const state = this.stateRepo.create({
      chatSession: chatSession,
      conversationStage: ConversationStage.INTRO, // Sử dụng enum thay vì string 'greeting'
      currentTopic: 'general',
      frustrationLevel: 0,
      satisfactionScore: 5,
      needsClarification: false,
      stateHistory: [],
    });

    return this.stateRepo.save(state);
  }

  async getCurrentStage(sessionId: string): Promise<string> {
    const state = await this.getOrCreateState(sessionId);
    return state.conversationStage;
  }

  async getCurrentTopic(sessionId: string): Promise<string> {
    const state = await this.getOrCreateState(sessionId);
    return state.currentTopic;
  }

  async getFrustrationLevel(sessionId: string): Promise<number> {
    const state = await this.getOrCreateState(sessionId);
    return state.frustrationLevel;
  }

  async needsClarification(sessionId: string): Promise<boolean> {
    const state = await this.getOrCreateState(sessionId);
    return state.needsClarification;
  }
}