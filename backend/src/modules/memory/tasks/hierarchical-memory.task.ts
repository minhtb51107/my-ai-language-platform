import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession } from '../../chat/entities/chat-session.entity';
import { HierarchicalMemory } from '../entities/hierarchical-memory.entity';
import { HierarchicalMemoryManager } from '../services/hierarchical-memory.manager';

@Injectable()
export class HierarchicalMemoryTask {
  private readonly logger = new Logger(HierarchicalMemoryTask.name);

  constructor(
    @InjectRepository(ChatSession)
    private readonly chatSessionRepo: Repository<ChatSession>,
    @InjectRepository(HierarchicalMemory)
    private readonly hmRepo: Repository<HierarchicalMemory>,
    private readonly hmManager: HierarchicalMemoryManager,
  ) {}

  // 300000ms = 5 phút
  @Interval(300000)
  async rebuildHierarchies() {
    this.logger.log("Bắt đầu xây dựng lại hierarchical memories...");
    
    const sessions = await this.chatSessionRepo.find();
    
    for (const session of sessions) {
      try {
        if (await this.hasNewSummaries(session.id)) {
          await this.hmManager.buildFullHierarchy(session);
          this.logger.debug(`Đã xây dựng hierarchy cho session ${session.id}`);
        }
      } catch (error) {
        this.logger.error(`Lỗi khi xây dựng hierarchy cho session ${session.id}`, error);
      }
    }
  }

  private async hasNewSummaries(sessionId: string): Promise<boolean> {
    const latestSummary = await this.hmRepo.findOne({
      where: { chatSession: { id: sessionId } },
      order: { updatedAt: 'DESC' }
    });
    
    if (!latestSummary) return false;
    
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
    return latestSummary.updatedAt > tenMinsAgo;
  }
}