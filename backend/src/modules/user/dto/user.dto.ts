import { IsString, IsOptional, MaxLength, IsEnum, IsUrl } from 'class-validator';
import { Gender } from '../user.enums';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  bio?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsUrl({}, { message: 'Avatar URL không hợp lệ' })
  avatarUrl?: string;
}