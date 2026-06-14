import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseInitService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseInitService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    try {
      // Kích hoạt extension vector của PostgreSQL
      await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS vector;');
      this.logger.log('PostgreSQL pgvector extension is verified and ready.');
    } catch (error: any) {
      this.logger.error('Failed to initialize pgvector extension', error.stack);
    }
  }
}