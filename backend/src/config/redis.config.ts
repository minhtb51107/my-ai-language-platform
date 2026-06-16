import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  // Chỉ dùng URL duy nhất, xóa bỏ host, port lắt nhắt
  url: process.env.REDIS_URL, 
}));