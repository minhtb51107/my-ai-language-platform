import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// LLM Domain
import { OpenAIService } from './llm/openai.service';

// RAG Domain
import { SmartChunkingService } from './rag/smart-chunking.service';
import { CohereRerankService } from './rag/cohere-rerank.service';
import { DocumentParserService } from './rag/document-parser.service'; // <-- THÊM DÒNG NÀY

// Cache Domain
import { SemanticCache } from './cache/semantic-cache.entity';
import { SemanticCacheService } from './cache/semantic-cache.service';

// Guardrails Domain
import { GuardrailService } from './guardrails/guardrail.service';

// Evaluations Domain
import { EvaluationResult } from './evaluations/evaluation-result.entity';
import { EvaluationService } from './evaluations/evaluation.service';

// Agents & Tools Domain
import { MemoryToolFactory } from './tools/memory.tool';
import { AgentService } from './agents/agent.service';

// Utilities
import { TokenManagementService } from './services/token-management.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SemanticCache, EvaluationResult]),
  ],
  providers: [
    OpenAIService,
    SmartChunkingService,
    CohereRerankService,
    DocumentParserService, // <-- THÊM VÀO PROVIDERS
    SemanticCacheService,
    GuardrailService,
    EvaluationService,
    MemoryToolFactory,
    AgentService,
    TokenManagementService,
  ],
  exports: [
    OpenAIService,
    SmartChunkingService,
    CohereRerankService,
    DocumentParserService, // <-- THÊM VÀO EXPORTS ĐỂ CHATMODULE DÙNG ĐƯỢC
    SemanticCacheService,
    GuardrailService,
    EvaluationService,
    MemoryToolFactory,
    AgentService,
    TokenManagementService,
  ],
})
export class AiModule {}