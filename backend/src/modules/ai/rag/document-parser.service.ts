import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import FormData from 'form-data'; // ✅ SỬA LỖI Ở ĐÂY: Bỏ "* as" đi

@Injectable()
export class DocumentParserService {
  private readonly logger = new Logger(DocumentParserService.name);
  private readonly baseUrl = 'https://api.cloud.llamaindex.ai/api/parsing';
  private readonly apiKey = process.env.LLAMAPARSE_API_KEY;

  /**
   * Đọc file PDF/Word bằng LlamaParse và trả về chuẩn Markdown (Giữ nguyên Bảng biểu)
   */
  async parseToMarkdown(fileBuffer: Buffer, fileName: string): Promise<string> {
    if (!this.apiKey) {
      throw new BadRequestException('Chưa cấu hình LLAMAPARSE_API_KEY trong .env');
    }

    try {
      this.logger.log(`Bắt đầu gửi file ${fileName} cho LlamaParse Vision...`);
      
      // 1. Upload File lên LlamaParse
      const formData = new FormData();
      formData.append('file', fileBuffer, { filename: fileName });

      const uploadRes = await axios.post(`${this.baseUrl}/upload`, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      const jobId = uploadRes.data.id;
      this.logger.log(`Đã tạo Job ID: ${jobId}. Đang chờ AI phân tích...`);

      // 2. Polling chờ kết quả (Vì phân tích Vision cần thời gian)
      let status = 'PENDING';
      let attempts = 0;
      const maxAttempts = 30; // Chờ tối đa 60 giây

      while (status !== 'SUCCESS' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Nghỉ 2 giây mỗi lần hỏi
        attempts++;

        const statusRes = await axios.get(`${this.baseUrl}/job/${jobId}`, {
          headers: { 'Authorization': `Bearer ${this.apiKey}` }
        });
        
        status = statusRes.data.status;
        if (status === 'ERROR') throw new Error('LlamaParse phân tích thất bại');
      }

      if (status !== 'SUCCESS') throw new Error('Timeout khi phân tích tài liệu');

      // 3. Lấy kết quả định dạng Markdown
      const resultRes = await axios.get(`${this.baseUrl}/job/${jobId}/result/markdown`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });

      this.logger.log(`Phân tích thành công! Kích thước Markdown: ${resultRes.data.markdown.length} ký tự.`);
      return resultRes.data.markdown;

    } catch (error: any) {
      this.logger.error(`Lỗi Document Parser: ${error.message}`);
      throw new BadRequestException('Lỗi phân tích tài liệu: ' + error.message);
    }
  }
}