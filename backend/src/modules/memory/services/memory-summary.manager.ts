import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { MemorySummary } from '../entities/memory-summary.entity';
import { ChatSession } from '../../chat/entities/chat-session.entity';
import { ChatMessage } from '../../chat/entities/chat-message.entity';
import { MemorySummarizerService } from './memory-summarizer.service';
import { HierarchicalMemoryManager } from './hierarchical-memory.manager';
import { OpenAIService } from '../../ai/llm/openai.service';

@Injectable()
export class MemorySummaryManager {
  private readonly MAX_SUMMARY_CHARS = 4000;
  private readonly logger = new Logger(MemorySummaryManager.name);

  constructor(
    @InjectRepository(MemorySummary)
    private readonly summaryRepo: Repository<MemorySummary>,
    private readonly summarizer: MemorySummarizerService,
    private readonly hierarchicalManager: HierarchicalMemoryManager,
    private readonly openAIService: OpenAIService,
    private readonly dataSource: DataSource,
    @InjectQueue('memory-tasks') private memoryQueue: Queue,
  ) {}

  async shouldUpdateMemory(session: ChatSession, recentMessages: ChatMessage[]): Promise<boolean> {
    const summary = await this.summaryRepo.findOne({ where: { chatSession: { id: session.id } } });
    if (!summary) return true;

    if (this.isTimeout(summary)) return true;
    if (this.isConversationTooLong(recentMessages)) return true;
    if (await this.shouldIncreaseTopicSegment(recentMessages)) return true;

    return false;
  }

  private isTimeout(summary: MemorySummary): boolean {
    const diffMins = (Date.now() - summary.lastUpdated.getTime()) / 60000;
    return diffMins > 10;
  }

  private isConversationTooLong(messages: ChatMessage[]): boolean {
    if (messages.length > 20) return true;
    const totalLength = messages.reduce((acc, m) => acc + (m.content?.length || 0), 0);
    if (totalLength > 3000) return true;
    if (messages[messages.length - 1]?.content.length > 300) return true;
    return false;
  }

  private async shouldIncreaseTopicSegment(recent: ChatMessage[]): Promise<boolean> {
    if (recent.length < 2) return false;
    const prevContent = recent[recent.length - 2].content;
    const latestContent = recent[recent.length - 1].content;

    try {
      // BƯỚC 1: Dùng Vector Similarity để đo đạc nhanh (Tiết kiệm Token API)
      const prevEmbedding = await this.openAIService.createEmbedding(prevContent);
      const latestEmbedding = await this.openAIService.createEmbedding(latestContent);

      const query = `
        SELECT 1 - ('[${prevEmbedding.join(',')}]'::vector <=> '[${latestEmbedding.join(',')}]'::vector) as similarity
      `;
      const result = await this.dataSource.query(query);
      const similarity = result[0].similarity;

      // Nếu quá khác biệt (< 40%), chắc chắn là đã chuyển chủ đề
      if (similarity < 0.4) return true;
      
      // Nếu khá giống nhau (> 75%), chắc chắn vẫn đang nói chuyện cũ
      if (similarity > 0.75) return false;

      // BƯỚC 2: Nếu ở mức lấp lửng (0.4 đến 0.75), dùng LLM để quyết định (Intent Classification)
      const prompt = `Bạn là chuyên gia phân tích hội thoại. Hãy xem xét 2 câu sau và cho biết người dùng có đang chuyển sang một chủ đề MỚI hay không.
      Câu trước: "${prevContent}"
      Câu sau: "${latestContent}"
      Chỉ trả về định dạng JSON: {"isTopicShift": true} hoặc {"isTopicShift": false}`;

      const aiResponse = await this.openAIService.generateText([{ role: 'user', content: prompt }]);
      
      // Parse JSON an toàn
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.isTopicShift === true;
      }
      
      return false; // Mặc định không ngắt segment nếu lỗi
    } catch (e) {
      this.logger.error("Lỗi khi kiểm tra Topic Shift bằng AI", e);
      return false; 
    }
  }

  async updateSummary(session: ChatSession, recent: ChatMessage[]) {
    const result = await this.summarizer.summarize(recent, "auto: timeout or topic shift");
    let condensed = result.content;
    
    if (condensed.length > this.MAX_SUMMARY_CHARS) {
       condensed = condensed.substring(0, this.MAX_SUMMARY_CHARS);
    }

    let memory = await this.summaryRepo.findOne({ where: { chatSession: { id: session.id } } });
    if (!memory) memory = this.summaryRepo.create({ chatSession: session, topicSegment: 0 });

    memory.summaryContent = condensed;
    memory.tokensUsed = result.tokensUsed;
    
    const isShift = await this.shouldIncreaseTopicSegment(recent);
    if (isShift) memory.topicSegment += 1;

    await this.summaryRepo.save(memory);

    await this.memoryQueue.add('rebuild-hierarchy', { 
      sessionId: session.id, 
      currentSegment: memory.topicSegment 
    }, { 
      delay: 5000, 
      removeOnComplete: true,
      removeOnFail: false
    });
  }
}