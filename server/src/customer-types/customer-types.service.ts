import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerTypeOption } from '../database/entities/customer-type.entity';

@Injectable()
export class CustomerTypesService {
  constructor(
    @InjectRepository(CustomerTypeOption)
    private readonly customerTypesRepository: Repository<CustomerTypeOption>,
  ) {}

  async findAllActive() {
    return this.customerTypesRepository.find({
      where: { isActive: true },
      order: {
        sortOrder: 'ASC',
        createdAt: 'ASC',
      },
    });
  }

  async ensureUsableCode(code: string) {
    const value = code.trim();
    const entity = await this.customerTypesRepository.findOne({
      where: {
        code: value,
        isActive: true,
      },
    });

    if (!entity) {
      throw new BadRequestException('客户类型不存在或已停用');
    }

    return entity.code;
  }

  async getDefaultTypeCode() {
    const [first] = await this.findAllActive();
    if (!first) {
      throw new BadRequestException('请先在数据库中配置至少一个可用的客户类型');
    }
    return first.code;
  }
}
