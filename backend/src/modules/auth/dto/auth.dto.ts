import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { Gender } from '../../user/user.enums';

export class RegisterRequestDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải từ 6 ký tự' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Handle không được để trống' })
  handle: string;

  @IsString()
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  fullname: string;

  @IsDateString({}, { message: 'Ngày sinh không hợp lệ' })
  dateOfBirth: Date;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;
}

export class VerifyRegisterOtpDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  otpCode: string;
}

export class LoginRequestDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class SendOtpRequestDto {
  @IsEmail()
  email: string;
}

export class VerifyOtpLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  otpCode: string;
}

// Interface lưu vào Redis khi user đang đăng ký dở dang
export interface RegisterTempData {
  fullname: string;
  email: string;
  passwordHash: string;
  handle: string;
  dateOfBirth: Date;
  gender?: Gender;
  otpCode: string;
  retryCount: number;
}