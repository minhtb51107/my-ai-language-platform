import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './services/user.service';
import { UserController } from './controllers/user.controller';

// Import các Entity của module User
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';

@Module({
  imports: [
    // KHAI BÁO BẢNG DỮ LIỆU Ở ĐÂY ĐỂ USERSERVICE CÓ THỂ DÙNG ĐƯỢC
    TypeOrmModule.forFeature([User, Role]), 
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService], // Export UserService để AuthModule có thể dùng ké
})
export class UserModule {}