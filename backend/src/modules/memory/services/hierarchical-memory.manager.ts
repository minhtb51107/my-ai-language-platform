import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';

import { HierarchicalMemory } from '../entities/hierarchical-memory.entity';
import { MemorySummary } from '../entities/memory-summary.entity';
import { ChatSession } from '../../chat/entities/chat-session.entity';
import { OpenAIService } from '../../ai/llm/openai.service';

@Injectable()
export class HierarchicalMemoryManager {
  private readonly logger = new Logger(HierarchicalMemoryManager.name);
  private readonly SEGMENTS_PER_LEVEL = 10;
  
  private readonly lastApiCallBySession = new Map<string, Date>();

  constructor(
    @InjectRepository(HierarchicalMemory)
    private readonly hmRepo: Repository<HierarchicalMemory>,
    @InjectRepository(MemorySummary)
    private readonly summaryRepo: Repository<MemorySummary>,
    private readonly openAIService: OpenAIService,
  ) {}

  private canCallApi(sessionId: string): boolean {
    const lastCall = this.lastApiCallBySession.get(sessionId);
    if (!lastCall) return true;
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
    return lastCall < thirtyMinsAgo;
  }

  async checkAndCreateHierarchicalSummary(session: ChatSession, currentSegment: number) {
    try {
      if (currentSegment % this.SEGMENTS_PER_LEVEL === 0 && currentSegment > 0) {
        // Build the tree upwards
        await this.buildFullHierarchy(session);
      }
    } catch (e) {
      this.logger.error(`Lỗi tạo hierarchical summary session ${session.id}`, e);
    }
  }

  async buildFullHierarchy(session: ChatSession) {
    const leafSummaries = await this.summaryRepo.find({
      where: { chatSession: { id: session.id } },
      order: { topicSegment: 'ASC' }
    });

    if (leafSummaries.length === 0) return;

    const maxSegment = Math.max(...leafSummaries.map(s => s.topicSegment));
    const maxLevel = this.calculateMaxLevel(maxSegment);

    for (let level = 1; level <= maxLevel; level++) {
      await this.buildLevel(session, level);
    }
  }

  private async buildLevel(session: ChatSession, level: number) {
    const segmentsInLevel = Math.pow(this.SEGMENTS_PER_LEVEL, level);
    const lowerLevelSummaries = await this.hmRepo.find({
      where: { chatSession: { id: session.id }, hierarchyLevel: level - 1 }
    });

    if (lowerLevelSummaries.length === 0) return;

    const minSegment = Math.min(...lowerLevelSummaries.map(h => h.segmentStart));
    const maxSegment = Math.max(...lowerLevelSummaries.map(h => h.segmentEnd));

    for (let start = minSegment; start <= maxSegment; start += segmentsInLevel) {
      const end = Math.min(start + segmentsInLevel - 1, maxSegment);
      const existing = await this.hmRepo.findOne({
        where: { chatSession: { id: session.id }, hierarchyLevel: level, segmentStart: start, segmentEnd: end }
      });

      if (!existing) {
        await this.createSummaryForLevel(session, level, start, end);
      }
    }
  }

  private async getChildSummaries(session: ChatSession, level: number, segmentStart: number, segmentEnd: number): Promise<HierarchicalMemory[]> {
    return this.hmRepo.find({
      where: { chatSession: { id: session.id }, hierarchyLevel: level, segmentStart: Between(segmentStart, segmentEnd) }
    });
  }

  private combineSummaries(summaries: HierarchicalMemory[]): string {
    return summaries.map(s => s.summaryContent).join('\n');
  }

  private async createSummaryForLevel(session: ChatSession, level: number, segmentStart: number, segmentEnd: number) {
    const childSummaries = await this.getChildSummaries(session, level - 1, segmentStart, segmentEnd);
    if (childSummaries.length === 0) return;

    const combinedContent = this.combineSummaries(childSummaries);
    const levelSummary = await this.generateHigherLevelSummary(combinedContent, session);

    const summary = this.hmRepo.create({
      chatSession: session,
      hierarchyLevel: level,
      segmentStart,
      segmentEnd,
      summaryContent: levelSummary
    });
    await this.hmRepo.save(summary);
  }

  private async generateHigherLevelSummary(combinedContent: string, session: ChatSession): Promise<string> {
    if (!this.canCallApi(session.id)) {
      return "Tóm tắt tạm thời: " + combinedContent.substring(0, Math.min(200, combinedContent.length));
    }
    if (combinedContent.length < 100) return "Tóm tắt tổng quan: " + combinedContent;

    try {
      const summary = await this.openAIService.generateText([
        { role: 'system', content: "Bạn là trợ lý tóm tắt chuyên nghiệp. Hãy tạo một bản tóm tắt cấp cao từ các bản tóm tắt con sau đây." },
        { role: 'user', content: "Tạo bản tóm tắt cấp cao từ các tóm tắt sau:\n\n" + combinedContent }
      ]);
      
      this.lastApiCallBySession.set(session.id, new Date());
      return summary;
    } catch (error) {
      return "Tóm tắt tổng quan: " + combinedContent.substring(0, 500);
    }
  }

  private calculateMaxLevel(maxSegment: number): number {
    return maxSegment === 0 ? 0 : Math.floor(Math.log(maxSegment + 1) / Math.log(this.SEGMENTS_PER_LEVEL));
  }
}