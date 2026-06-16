import { Injectable, Logger } from '@nestjs/common';
import { EmotionContext } from '../entities/emotion-context.entity';
import { OpenAIService } from '../../ai/llm/openai.service';

@Injectable()
export class EmotionAnalysisService {
  private readonly logger = new Logger(EmotionAnalysisService.name);

  // ... (keep EMOTION_KEYWORDS and EMOTION_PATTERNS as they were) ...
  private readonly EMOTION_KEYWORDS: Record<string, number> = {
    happy: 0.8, joy: 0.9, excited: 0.85, great: 0.7,
    sad: 0.8, unhappy: 0.75, disappoint: 0.8, sorry: 0.7,
    angry: 0.9, mad: 0.85, frustrat: 0.8, annoy: 0.75,
    neutral: 0.5, ok: 0.4, fine: 0.4,
  };

  private readonly EMOTION_PATTERNS: { pattern: RegExp; emotion: string }[] = [
    { pattern: /(very|really|extremely|so) (happy|excited|joyful)/i, emotion: 'excited' },
    { pattern: /(not good|not happy|unhappy|sad)/i, emotion: 'sad' },
    { pattern: /(angry|mad|furious|pissed)/i, emotion: 'angry' },
    { pattern: /(\!\!|\!{2,})/i, emotion: 'excited' },
    { pattern: /(\?\?|\?{2,})/i, emotion: 'confused' },
  ];

  constructor(private readonly openAIService: OpenAIService) {}

  async analyzeEmotion(text: string, existingContext?: EmotionContext): Promise<EmotionContext> {
    const context = existingContext || new EmotionContext();
    
    // Rule-based analysis
    let detectedEmotion = this.detectEmotionFromText(text);
    let intensity = this.calculateEmotionIntensity(text, detectedEmotion);

    // AI-based analysis cho các trường hợp phức tạp
    if (intensity > 0.7 || this.isComplexEmotion(text)) {
      const aiAnalysis = await this.analyzeWithAI(text);
      detectedEmotion = aiAnalysis.emotion !== 'neutral' ? aiAnalysis.emotion : detectedEmotion;
      intensity = aiAnalysis.intensity !== 0.5 ? aiAnalysis.intensity : intensity;
    }

    context.currentEmotion = detectedEmotion;
    context.emotionIntensity = intensity ?? 0.5;

    // Cập nhật lịch sử
    if (!context.emotionHistory) context.emotionHistory = {};
    context.emotionHistory[new Date().toISOString()] = detectedEmotion;

    return context;
  }

  // ... (keep detectEmotionFromText, calculateEmotionIntensity, countOccurrences, isComplexEmotion as they were) ...
  private detectEmotionFromText(text: string): string {
    const lowerText = text.toLowerCase();
    for (const { pattern, emotion } of this.EMOTION_PATTERNS) {
      if (pattern.test(lowerText)) return emotion;
    }
    let dominantEmotion = 'neutral';
    let maxScore = 0.0;
    for (const [keyword, value] of Object.entries(this.EMOTION_KEYWORDS)) {
      if (lowerText.includes(keyword)) {
        const score = value * this.countOccurrences(lowerText, keyword);
        if (score > maxScore) {
          maxScore = score;
          dominantEmotion = keyword;
        }
      }
    }
    return dominantEmotion;
  }

  private calculateEmotionIntensity(text: string, emotion: string): number {
    const baseIntensity = this.EMOTION_KEYWORDS[emotion] || 0.5;
    const exclamationCount = this.countOccurrences(text, '!');
    const questionCount = this.countOccurrences(text, '?');
    let intensity = baseIntensity;
    intensity += exclamationCount * 0.1;
    intensity -= questionCount * 0.05;
    intensity += Math.min(text.length / 100.0, 0.3);
    return Math.min(Math.max(intensity, 0.1), 1.0);
  }

  private countOccurrences(text: string, substring: string): number {
    return text.split(substring).length - 1;
  }

  private isComplexEmotion(text: string): boolean {
    return text.length > 50 && this.countOccurrences(text, ' ') > 8;
  }

  private async analyzeWithAI(text: string): Promise<{ emotion: string; intensity: number; confidence: number }> {
    try {
      const prompt = `Phân tích cảm xúc của đoạn text sau. Trả về JSON format: {"emotion": "", "intensity": 0.0, "confidence": 0.0}\n\nText: ${text}`;
      
      const responseText = await this.openAIService.generateText([
        { role: 'user', content: prompt }
      ]);

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          emotion: parsed.emotion || 'neutral',
          intensity: parsed.intensity ?? 0.5,
          confidence: parsed.confidence ?? 0.7
        };
      }
      throw new Error('Invalid JSON format');
    } catch (e) {
      this.logger.error('Failed to analyze emotion with AI', e);
      return { emotion: 'neutral', intensity: 0.5, confidence: 0.5 };
    }
  }
}