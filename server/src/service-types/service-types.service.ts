import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceTypeOption } from '../database/entities/service-type.entity';

@Injectable()
export class ServiceTypesService {
  constructor(
    @InjectRepository(ServiceTypeOption)
    private readonly serviceTypesRepository: Repository<ServiceTypeOption>,
  ) {}

  async findAllActive() {
    return this.serviceTypesRepository.find({
      where: { isActive: true },
      order: {
        sortOrder: 'ASC',
        createdAt: 'ASC',
      },
    });
  }

  async ensureUsableCode(code: string) {
    const value = code.trim();
    const entity = await this.serviceTypesRepository.findOne({
      where: {
        code: value,
        isActive: true,
      },
    });

    if (!entity) {
      throw new BadRequestException('服务类型不存在或已停用');
    }

    return entity.code;
  }

  async getDefaultTypeCode() {
    const [first] = await this.findAllActive();
    if (!first) {
      throw new BadRequestException('请先在数据库中配置至少一个可用的服务类型');
    }
    return first.code;
  }
}
