import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

@Processor('email-tasks')
@Injectable()
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly configService: ConfigService) {
    super();
    // Khởi tạo SendGrid API Key
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    if (apiKey) {
      sgMail.setApiKey(apiKey);
    } else {
      this.logger.warn('SENDGRID_API_KEY chưa được cấu hình!');
    }
  }

  async process(job: Job<any, any, string>): Promise<any> {
    if (job.name === 'send-email') {
      const { to, subject, content } = job.data;
      this.logger.log(`Đang xử lý gửi email tới: ${to} | Subject: ${subject}`);
      
      const fromEmail = this.configService.get<string>('SENDGRID_FROM_EMAIL') || 'noreply@mindrevol.com';

      const msg = {
        to: to,
        from: fromEmail,
        subject: subject,
        html: content,
      };

      try {
        await sgMail.send(msg);
        this.logger.log(`Đã gửi email thành công tới: ${to}`);
      } catch (error: any) {
        this.logger.error(`Lỗi khi gửi email qua SendGrid tới ${to}`, error.response?.body || error);
        throw error; // Ném lỗi để BullMQ tự động retry
      }
    }
  }
}