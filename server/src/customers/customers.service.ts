import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { CustomerTypesService } from '../customer-types/customer-types.service';
import { Customer } from '../database/entities/customer.entity';
import { Schedule } from '../database/entities/schedule.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customersRepository: Repository<Customer>,
    @InjectRepository(Schedule)
    private readonly schedulesRepository: Repository<Schedule>,
    private readonly customerTypesService: CustomerTypesService,
  ) {}

  async findAll(userId: string, query: QueryCustomersDto) {
    const builder = this.customersRepository
      .createQueryBuilder('customer')
      .where('customer.user_id = :userId', { userId })
      .orderBy('customer.created_at', 'DESC');

    if (query.keyword) {
      builder.andWhere(
        '(customer.name LIKE :keyword OR customer.phone LIKE :keyword)',
        {
          keyword: `%${query.keyword}%`,
        },
      );
    }

    return builder.getMany();
  }

  async create(userId: string, payload: CreateCustomerDto) {
    const normalizedTypeCode = await this.customerTypesService.ensureUsableCode(
      payload.type,
    );

    const exists = await this.customersRepository.findOne({
      where: { userId, phone: payload.phone },
    });
    if (exists) {
      throw new ConflictException('该手机号客户已存在');
    }

    const entity = this.customersRepository.create({
      id: uuidv4(),
      userId,
      ...payload,
      type: normalizedTypeCode,
      isLongTerm: payload.isLongTerm ?? true,
      tags: payload.tags ?? [],
      tailPaymentDate: payload.tailPaymentDate ?? null,
      style: payload.style ?? '',
      hobby: payload.hobby ?? '',
      specialNeed: payload.specialNeed ?? '',
      outfit: payload.outfit ?? '',
      location: payload.location ?? '',
      companions: payload.companions ?? '',
    });
    return this.customersRepository.save(entity);
  }

  async update(userId: string, id: string, payload: UpdateCustomerDto) {
    const customer = await this.customersRepository.findOne({
      where: { id, userId },
    });
    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    if (payload.phone && payload.phone !== customer.phone) {
      const exists = await this.customersRepository.findOne({
        where: { userId, phone: payload.phone },
      });
      if (exists && exists.id !== id) {
        throw new ConflictException('手机号已被其他客户使用');
      }
    }

    if (payload.type) {
      payload.type = await this.customerTypesService.ensureUsableCode(
        payload.type,
      );
    }

    Object.assign(customer, {
      ...payload,
      tags: payload.tags ?? customer.tags,
    });
    const saved = await this.customersRepository.save(customer);

    if (payload.location) {
      await this.schedulesRepository.update(
        { userId, customerId: id },
        { location: payload.location },
      );
    }

    return saved;
  }

  async remove(userId: string, id: string) {
    const customer = await this.customersRepository.findOne({
      where: { id, userId },
    });
    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    await this.customersRepository.remove(customer);
    return { success: true };
  }
}
