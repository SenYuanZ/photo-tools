import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSetting } from '../database/entities/user-setting.entity';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(UserSetting)
    private readonly settingsRepository: Repository<UserSetting>,
  ) {}

  async get(userId: string) {
    const settings = await this.settingsRepository.findOne({
      where: { userId },
    });
    if (!settings) {
      throw new NotFoundException('设置不存在');
    }
    return settings;
  }

  async update(userId: string, payload: UpdateSettingsDto) {
    const settings = await this.settingsRepository.findOne({
      where: { userId },
    });
    if (!settings) {
      throw new NotFoundException('设置不存在');
    }

    Object.assign(settings, payload);
    return this.settingsRepository.save(settings);
  }
}
