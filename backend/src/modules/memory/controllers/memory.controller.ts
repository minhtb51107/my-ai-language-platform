import { Controller, Get, Post, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../../jwt-auth.guard';
import { MemoryService } from '../services/memory.service';

@UseGuards(JwtAuthGuard)
@Controller('api/v1/memory')
export class MemoryController {
  constructor(private readonly memoryService: MemoryService) {}

  // ==========================================
  // API KHO TÀI LIỆU (STORAGE UI) - Đặt lên trên :id
  // ==========================================
  @Get('documents')
  async getDocuments(@Req() req: any) {
    const data = await this.memoryService.getUserDocuments(req.user.userId);
    return { message: 'Lấy kho tài liệu thành công', data };
  }

  @Delete('documents/:sourceName')
  async deleteDocument(@Req() req: any, @Param('sourceName') sourceName: string) {
    return this.memoryService.deleteDocument(req.user.userId, sourceName);
  }

  // ==========================================
  // API KÝ ỨC CÁ NHÂN (CŨ)
  // ==========================================
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