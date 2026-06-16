import { IsString, IsUUID, IsNotEmpty, MaxLength } from 'class-validator';

export class ChatMessageDto {
  @IsUUID('all', { message: 'SessionId không đúng định dạng' })
  @IsNotEmpty()
  sessionId: string;

  @IsString()
  @IsNotEmpty({ message: 'Tin nhắn không được để trống' })
  @MaxLength(2000, { message: 'Tin nhắn không được vượt quá 2000 ký tự' })
  message: string;
}