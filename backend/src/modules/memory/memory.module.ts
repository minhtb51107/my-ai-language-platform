import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';

import { KnowledgeChunk } from './entities/knowledge-chunk.entity';
import { MemorySummary } from './entities/memory-summary.entity';
import { HierarchicalMemory } from './entities/hierarchical-memory.entity';
import { ChatSession } from '../chat/entities/chat-session.entity'; // Để Inject cho Processor

import { MemoryService } from './services/memory.service';
import { MemorySummaryManager } from './services/memory-summary.manager';
import { MemorySummarizerService } from './services/memory-summarizer.service';
import { HierarchicalMemoryManager } from './services/hierarchical-memory.manager';
import { HierarchicalMemoryProcessor } from './tasks/hierarchical-memory.processor';

import { AiModule } from '../ai/ai.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      KnowledgeChunk, 
      MemorySummary, 
      HierarchicalMemory, 
      ChatSession
    ]),
    BullModule.registerQueue({
      name: 'memory-tasks',
    }),
    AiModule
  ],
  providers: [
    MemoryService,
    MemorySummaryManager,
    MemorySummarizerService,
    HierarchicalMemoryManager,
    HierarchicalMemoryProcessor // Thay thế cho .task cũ
  ],
  exports: [MemoryService, TypeOrmModule],
})
export class MemoryModule {}