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

const DISPLAY_VISIBLE = 'Y';
const DISPLAY_HIDDEN = 'N';

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
      .andWhere('customer.display_status = :visible', {
        visible: DISPLAY_VISIBLE,
      })
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
    if (exists?.displayStatus === DISPLAY_VISIBLE) {
      throw new ConflictException('该手机号客户已存在');
    }

    if (exists?.displayStatus === DISPLAY_HIDDEN) {
      Object.assign(exists, {
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
        displayStatus: DISPLAY_VISIBLE,
      });

      return this.customersRepository.save(exists);
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
      where: { id, userId, displayStatus: DISPLAY_VISIBLE },
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
        { userId, customerId: id, displayStatus: DISPLAY_VISIBLE },
        { location: payload.location },
      );
    }

    return saved;
  }

  async remove(userId: string, id: string) {
    const customer = await this.customersRepository.findOne({
      where: { id, userId, displayStatus: DISPLAY_VISIBLE },
    });
    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    await this.customersRepository.update(
      { id, userId, displayStatus: DISPLAY_VISIBLE },
      { displayStatus: DISPLAY_HIDDEN },
    );
    await this.schedulesRepository.update(
      { userId, customerId: id, displayStatus: DISPLAY_VISIBLE },
      { displayStatus: DISPLAY_HIDDEN },
    );
    return { success: true };
  }
}
