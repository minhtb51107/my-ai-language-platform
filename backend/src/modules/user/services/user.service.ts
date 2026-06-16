import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UpdateProfileDto } from '../dto/user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async getUserProfile(userId: string): Promise<User> {
    const user = await this.userRepo.findOne({ 
      where: { id: userId },
      relations: ['roles'] // Lấy thêm quyền hạn để hiển thị VIP/Free
    });
    
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    return user;
  }

  async updateProfile(userId: string, updateData: UpdateProfileDto): Promise<User> {
    const user = await this.getUserProfile(userId);
    
    // Merge dữ liệu mới vào user hiện tại
    Object.assign(user, updateData);
    
    return this.userRepo.save(user);
  }
}