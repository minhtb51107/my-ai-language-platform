import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  @MaxLength(100)
  title: string;
}

export class UpdateSessionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;
}