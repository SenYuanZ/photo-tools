import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { DepositStatus } from '../common/enums/app.enums';
import { CustomerTypesService } from '../customer-types/customer-types.service';
import { Customer } from '../database/entities/customer.entity';
import { Schedule } from '../database/entities/schedule.entity';
import { User } from '../database/entities/user.entity';
import { SchedulesService } from '../schedules/schedules.service';
import { CreatePublicBookingDto } from './dto/create-public-booking.dto';

const STEP_MINUTES = 30;

const toMinutes = (value: string): number => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

const toTimeText = (minutes: number): string => {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

const allSlots = Array.from({ length: (24 * 60) / STEP_MINUTES }, (_, index) =>
  toTimeText(index * STEP_MINUTES),
);

const buildRanges = (slots: string[]) => {
  if (!slots.length) {
    return [];
  }

  const values = slots.map(toMinutes).sort((left, right) => left - right);
  const result: Array<{ startTime: string; endTime: string }> = [];

  let start = values[0];
  let previous = values[0];

  for (let index = 1; index < values.length; index += 1) {
    const current = values[index];
    if (current - previous !== STEP_MINUTES) {
      result.push({
        startTime: toTimeText(start),
        endTime: toTimeText(previous + STEP_MINUTES),
      });
      start = current;
    }
    previous = current;
  }

  result.push({
    startTime: toTimeText(start),
    endTime: toTimeText(previous + STEP_MINUTES),
  });

  return result;
};

@Injectable()
export class PublicBookingService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Customer)
    private readonly customersRepository: Repository<Customer>,
    @InjectRepository(Schedule)
    private readonly schedulesRepository: Repository<Schedule>,
    private readonly schedulesService: SchedulesService,
    private readonly customerTypesService: CustomerTypesService,
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

  async getAvailability(photographerId: string, date: string) {
    const photographer = await this.usersRepository.findOne({
      where: { id: photographerId },
      select: { id: true },
    });

    if (!photographer) {
      throw new NotFoundException('摄影师不存在，请重新选择');
    }

    const schedules = await this.schedulesRepository.find({
      where: { userId: photographerId, date },
      order: { startTime: 'ASC' },
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true,
      },
    });

    const blockedSet = new Set<string>();

    schedules.forEach((item) => {
      const start = toMinutes(item.startTime);
      const end = toMinutes(item.endTime);

      for (let cursor = start; cursor < end; cursor += STEP_MINUTES) {
        blockedSet.add(toTimeText(cursor));
      }
    });

    const blockedSlots = allSlots.filter((slot) => blockedSet.has(slot));
    const availableSlots = allSlots.filter((slot) => !blockedSet.has(slot));

    return {
      photographerId,
      date,
      stepMinutes: STEP_MINUTES,
      busyRanges: schedules.map((item) => ({
        startTime: item.startTime,
        endTime: item.endTime,
      })),
      blockedSlots,
      availableSlots,
      freeRanges: buildRanges(availableSlots),
    };
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

    const defaultTypeCode =
      await this.customerTypesService.getDefaultTypeCode();

    const entity = this.customersRepository.create({
      id: uuidv4(),
      userId: payload.photographerId,
      name: payload.modelName,
      phone: payload.modelPhone,
      isLongTerm: false,
      type: defaultTypeCode,
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
