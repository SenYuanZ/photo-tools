import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';
import {
  normalizeUploadUrl,
  normalizeUploadUrls,
} from '../common/utils/upload-url.util';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async get(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: {
        id: true,
        account: true,
        nickname: true,
        role: true,
        avatarUrl: true,
        bio: true,
        portfolioImages: true,
        portfolioPublic: true,
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return {
      ...user,
      avatarUrl: normalizeUploadUrl(user.avatarUrl),
      bio: user.bio || '',
      portfolioImages: normalizeUploadUrls(user.portfolioImages),
      portfolioPublic: Boolean(user.portfolioPublic),
    };
  }

  async update(userId: string, payload: UpdateProfileDto) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    if (payload.nickname !== undefined) {
      user.nickname = payload.nickname;
    }

    if (payload.avatarUrl !== undefined) {
      user.avatarUrl = normalizeUploadUrl(payload.avatarUrl);
    }

    if (payload.bio !== undefined) {
      user.bio = payload.bio;
    }

    if (payload.portfolioImages !== undefined) {
      user.portfolioImages = normalizeUploadUrls(payload.portfolioImages);
    }

    if (payload.portfolioPublic !== undefined) {
      user.portfolioPublic = payload.portfolioPublic;
    }

    const saved = await this.usersRepository.save(user);

    return {
      id: saved.id,
      account: saved.account,
      nickname: saved.nickname,
      role: saved.role,
      avatarUrl: normalizeUploadUrl(saved.avatarUrl),
      bio: saved.bio || '',
      portfolioImages: normalizeUploadUrls(saved.portfolioImages),
      portfolioPublic: Boolean(saved.portfolioPublic),
    };
  }
}
