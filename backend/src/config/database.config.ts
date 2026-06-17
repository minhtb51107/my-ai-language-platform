import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs('database', (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'ai_learning_db',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: process.env.NODE_ENV !== 'production', // Tự động sync schema ở môi trường dev
  logging: ['error', 'warn'], // Chỉ in log khi có lỗi, bỏ in các câu query bình thường
  extra: {
    max: 20, // Tương đương với HikariCP connection pool trong Spring Boot
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  }
}));