import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service';

@Global() // Đặt làm Global Module để không cần import thủ công ở các module khác
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}