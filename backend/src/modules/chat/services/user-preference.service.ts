import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPreference } from '../entities/user-preference.entity';
import { User } from '../../user/entities/user.entity';

@Injectable()
export class UserPreferenceService {
  private readonly TOPIC_KEYWORDS: Record<string, number> = {
    technology: 0.1, programming: 0.2, code: 0.15,
    music: 0.1, song: 0.1, artist: 0.1,
    sports: 0.1, game: 0.1, player: 0.1,
    science: 0.1, research: 0.1, discover: 0.1,
  };

  constructor(
    @InjectRepository(UserPreference)
    private readonly preferenceRepo: Repository<UserPreference>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async getOrCreateUserPreference(userId: string): Promise<UserPreference> {
    let preference = await this.preferenceRepo.findOne({ where: { user: { id: userId } }, relations: ['user'] });
    if (!preference) {
      preference = await this.createDefaultPreference(userId);
    }
    return preference;
  }

  async updateTopicInterest(userId: string, topic: string, delta: number): Promise<void> {
    const preference = await this.getOrCreateUserPreference(userId);
    const topics = preference.favoriteTopics || {};
    
    const currentInterest = topics[topic] || 0.5;
    const newInterest = Math.min(Math.max(currentInterest + delta, 0.0), 1.0);
    
    topics[topic] = newInterest;
    preference.favoriteTopics = topics;
    
    await this.preferenceRepo.save(preference);
  }

  async detectAndUpdatePreferences(userId: string, message: string, aiResponse?: string): Promise<void> {
    const preference = await this.getOrCreateUserPreference(userId);

    this.detectCommunicationStyle(preference, message);
    this.detectDetailPreference(preference, aiResponse);
    this.detectTopics(preference, message);

    await this.preferenceRepo.save(preference);
  }

  private detectCommunicationStyle(preference: UserPreference, message: string) {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('please') || lowerMessage.includes('would you') || lowerMessage.includes('could you')) {
      preference.communicationStyle = 'formal';
    } else if (lowerMessage.includes('hey') || lowerMessage.includes("what's up") || lowerMessage.includes('lol')) {
      preference.communicationStyle = 'casual';
    } else if (lowerMessage.includes('explain') || lowerMessage.includes('detail') || lowerMessage.includes('how does')) {
      preference.communicationStyle = 'technical';
    }
  }

  private detectDetailPreference(preference: UserPreference, aiResponse?: string) {
    if (aiResponse) {
      const length = aiResponse.length;
      if (length < 100) {
        preference.detailPreference = 'concise';
      } else if (length > 300) {
        preference.detailPreference = 'detailed';
      } else {
        preference.detailPreference = 'balanced';
      }
    }
  }

  private detectTopics(preference: UserPreference, message?: string) {
    if (message) {
      const lowerMessage = message.toLowerCase();
      const topics = preference.favoriteTopics || {};
      let hasUpdate = false;

      for (const [topic, value] of Object.entries(this.TOPIC_KEYWORDS)) {
        if (lowerMessage.includes(topic)) {
          const currentInterest = topics[topic] || 0.5;
          topics[topic] = Math.min(Math.max(currentInterest + value, 0.0), 1.0);
          hasUpdate = true;
        }
      }

      if (hasUpdate) {
        preference.favoriteTopics = topics;
      }
    }
  }

  private async createDefaultPreference(userId: string): Promise<UserPreference> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User not found with id: ${userId}`);

    const preference = this.preferenceRepo.create({
      user: user,
      favoriteTopics: {},
      communicationStyle: 'balanced',
      detailPreference: 'balanced',
      learningStyle: 'visual',
      dislikedContent: [],
    });

    return this.preferenceRepo.save(preference);
  }

  async getUserPreferencesForPrompt(userId: string): Promise<Record<string, any>> {
    const preference = await this.getOrCreateUserPreference(userId);
    return {
      communicationStyle: preference.communicationStyle,
      detailPreference: preference.detailPreference,
      learningStyle: preference.learningStyle,
      favoriteTopics: preference.favoriteTopics,
    };
  }
}