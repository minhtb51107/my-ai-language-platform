import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { HierarchicalMemoryManager } from '../services/hierarchical-memory.manager';
import { ChatSession } from '../../chat/entities/chat-session.entity';

@Processor('memory-tasks')
@Injectable()
export class HierarchicalMemoryProcessor extends WorkerHost {
  private readonly logger = new Logger(HierarchicalMemoryProcessor.name);

  constructor(
    private readonly hmManager: HierarchicalMemoryManager,
    @InjectRepository(ChatSession)
    private readonly chatSessionRepo: Repository<ChatSession>,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    if (job.name === 'rebuild-hierarchy') {
      const { sessionId, currentSegment } = job.data;
      this.logger.log(`Processing hierarchy for session: ${sessionId} at segment ${currentSegment}`);
      
      const session = await this.chatSessionRepo.findOne({ where: { id: sessionId } });
      if (session) {
        // Thực thi logic build hierarchy một cách an toàn qua queue
        await this.hmManager.checkAndCreateHierarchicalSummary(session, currentSegment);
      } else {
        this.logger.warn(`Session ${sessionId} not found for hierarchy rebuild.`);
      }
    }
  }
}