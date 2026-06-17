import { IsString, IsUUID, IsNotEmpty, MaxLength, IsOptional, IsArray } from 'class-validator';

export class ChatMessageDto {
  @IsUUID('all', { message: 'SessionId không đúng định dạng' })
  @IsNotEmpty()
  sessionId: string;

  @IsString()
  @IsOptional() // Có thể gửi mỗi hình ảnh mà không cần nhập text
  @MaxLength(4000)
  message?: string;

  @IsOptional()
  @IsArray()
  attachments?: any[];
}