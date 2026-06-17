import { Controller, Post, UseInterceptors, UploadedFile, Param, UseGuards, Req, BadRequestException, Logger } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../../jwt-auth.guard'; 

import { SmartChunkingService } from '../../ai/rag/smart-chunking.service';
import { DocumentParserService } from '../../ai/rag/document-parser.service'; // IMPORT MỚI
import { MemoryService } from '../../memory/services/memory.service';
import 'multer';

@UseGuards(JwtAuthGuard)
@Controller('api/v1/chats/:sessionId/files')
export class FileController {
  private readonly logger = new Logger(FileController.name);

  constructor(
    private readonly chunkingService: SmartChunkingService,
    private readonly documentParser: DocumentParserService, // TIÊM SERVICE MỚI
    private readonly memoryService: MemoryService 
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 15 * 1024 * 1024 }, // Tăng giới hạn lên 15MB cho PDF
  }))
  async uploadFile(
    @Req() req: any, 
    @Param('sessionId') sessionId: string, 
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) throw new BadRequestException('Không tìm thấy file tải lên');

    this.logger.log(`Bắt đầu xử lý file: ${file.originalname} (${file.mimetype})`);

    try {
      // XỬ LÝ ẢNH TRỰC TIẾP
      if (file.mimetype.startsWith('image/')) {
        const base64Image = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        return { url: base64Image, name: file.originalname, type: file.mimetype, isDocument: false };
      } 

      // XỬ LÝ TÀI LIỆU VỚI AI VISION (PDF, DOCX)
      let extractedMarkdown = '';
      if (file.mimetype === 'application/pdf' || file.mimetype.includes('word')) {
        // GỌI LLAMA PARSE
        extractedMarkdown = await this.documentParser.parseToMarkdown(file.buffer, file.originalname);
      } 
      else if (file.mimetype.startsWith('text/')) {
        extractedMarkdown = file.buffer.toString('utf-8');
      } 
      else {
        throw new BadRequestException('Định dạng file không hỗ trợ. Vui lòng dùng PDF, DOCX, TXT hoặc Ảnh.');
      }

      // CHUNKING NGỮ NGHĨA & LƯU VÀO VECTOR DB
      if (extractedMarkdown && extractedMarkdown.trim().length > 0) {
        // Băm theo thẻ Heading ##
        const chunks = await this.chunkingService.chunkText(extractedMarkdown);
        
        // Lưu từng chunk vào MemoryService (pgvector Database)
        for (const chunkContent of chunks) {
          await this.memoryService.saveKnowledge(
            req.user.userId, 
            chunkContent, 
            { sourceName: file.originalname, sessionId: sessionId }
          );
        }
      }

      return { 
        url: '', 
        name: file.originalname, 
        type: file.mimetype,
        isDocument: true,
        message: 'Đã phân tích và học xong tài liệu chuẩn Enterprise!'
      };

    } catch (error: any) {
      this.logger.error(`Lỗi xử lý file: ${error.message}`);
      throw new BadRequestException('Không thể xử lý file này: ' + error.message);
    }
  }
}