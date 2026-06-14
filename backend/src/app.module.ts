import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';

import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import { RedisModule } from './core/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { DatabaseInitService } from './core/database.init.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, redisConfig],
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => 
        configService.get<TypeOrmModuleOptions>('database')!,
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(), // Kích hoạt Event Emitter cho luồng gửi Email
    RedisModule,
    AuthModule,
  ],
  providers: [DatabaseInitService], // Kích hoạt khởi tạo PgVector
})
export class AppModule {}