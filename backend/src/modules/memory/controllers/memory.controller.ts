import { Controller, Get, Post, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../../jwt-auth.guard';
import { MemoryService } from '../services/memory.service';

@UseGuards(JwtAuthGuard)
@Controller('api/v1/memory')
export class MemoryController {
  constructor(private readonly memoryService: MemoryService) {}

  @Get()
  async getMyMemories(@Req() req: any) {
    const memories = await this.memoryService.getUserManualMemories(req.user.userId);
    return { message: 'Lấy danh sách trí nhớ cá nhân thành công', data: memories };
  }

  @Post()
  async addMemory(@Req() req: any, @Body('content') content: string) {
    const memory = await this.memoryService.saveKnowledge(
      req.user.userId, 
      content, 
      { source: 'manual_input' }
    );
    return { message: 'Đã lưu trí nhớ mới cho AI', data: memory };
  }

  @Delete(':id')
  async deleteMemory(@Req() req: any, @Param('id') memoryId: string) {
    await this.memoryService.deleteMemory(memoryId, req.user.userId);
    return { message: 'Đã xóa trí nhớ' };
  }
}