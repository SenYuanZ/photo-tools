import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { CustomerType, DepositStatus } from '../common/enums/app.enums';
import { Customer } from '../database/entities/customer.entity';
import { User } from '../database/entities/user.entity';
import { SchedulesService } from '../schedules/schedules.service';
import { CreatePublicBookingDto } from './dto/create-public-booking.dto';

@Injectable()
export class PublicBookingService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Customer)
    private readonly customersRepository: Repository<Customer>,
    private readonly schedulesService: SchedulesService,
  ) {}

  async listPhotographers() {
    const users = await this.usersRepository.find({
      select: {
        id: true,
        account: true,
        nickname: true,
      },
      order: {
        createdAt: 'ASC',
      },
    });

    return users.map((user) => ({
      id: user.id,
      nickname: user.nickname,
      account: user.account,
    }));
  }

  async createBooking(payload: CreatePublicBookingDto) {
    const photographer = await this.usersRepository.findOne({
      where: { id: payload.photographerId },
      select: {
        id: true,
        nickname: true,
      },
    });

    if (!photographer) {
      throw new NotFoundException('摄影师不存在，请重新选择');
    }

    const customer = await this.findOrCreateCustomer(payload);

    const schedule = await this.schedulesService.create(photographer.id, {
      customerId: customer.id,
      date: payload.date,
      startTime: payload.startTime,
      endTime: payload.endTime,
      location: payload.location,
      note: payload.poseRequirement,
      referenceImages: payload.referenceImages ?? [],
      depositStatus: DepositStatus.UNPAID,
      amount: 0,
    });

    return {
      success: true,
      bookingId: schedule.id,
      photographer,
    };
  }

  private async findOrCreateCustomer(payload: CreatePublicBookingDto) {
    const existingCustomer = await this.customersRepository.findOne({
      where: {
        userId: payload.photographerId,
        phone: payload.modelPhone,
      },
    });

    if (existingCustomer) {
      return existingCustomer;
    }

    const entity = this.customersRepository.create({
      id: uuidv4(),
      userId: payload.photographerId,
      name: payload.modelName,
      phone: payload.modelPhone,
      type: CustomerType.PERSONAL,
      style: '',
      hobby: '',
      specialNeed: payload.poseRequirement,
      depositStatus: DepositStatus.UNPAID,
      tailPaymentDate: null,
      outfit: '',
      location: payload.location,
      companions: '',
      tags: ['模特自助预约'],
    });

    return this.customersRepository.save(entity);
  }
}
