import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  ReminderType,
  ServiceTypeCode,
  UserRole,
} from '../common/enums/app.enums';
import { CustomerTypesService } from '../customer-types/customer-types.service';
import { ServiceTypesService } from '../service-types/service-types.service';
import { isTimeOverlap, isTimeRangeValid } from '../common/utils/time.util';
import { BookingGroup } from '../database/entities/booking-group.entity';
import { Customer } from '../database/entities/customer.entity';
import { Schedule } from '../database/entities/schedule.entity';
import { UserSetting } from '../database/entities/user-setting.entity';
import { User } from '../database/entities/user.entity';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { QueryHistoryDto } from './dto/query-history.dto';
import { QuerySchedulesDto } from './dto/query-schedules.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

const toDateString = (date: Date) => date.toISOString().slice(0, 10);

@Injectable()
export class SchedulesService {
  constructor(
    @InjectRepository(Schedule)
    private readonly schedulesRepository: Repository<Schedule>,
    @InjectRepository(Customer)
    private readonly customersRepository: Repository<Customer>,
    @InjectRepository(UserSetting)
    private readonly settingsRepository: Repository<UserSetting>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(BookingGroup)
    private readonly bookingGroupsRepository: Repository<BookingGroup>,
    private readonly customerTypesService: CustomerTypesService,
    private readonly serviceTypesService: ServiceTypesService,
  ) {}

  async findAll(userId: string, query: QuerySchedulesDto) {
    const builder = this.schedulesRepository
      .createQueryBuilder('schedule')
      .where('schedule.user_id = :userId', { userId })
      .orderBy('schedule.date', 'ASC')
      .addOrderBy('schedule.start_time', 'ASC');

    if (query.date) {
      builder.andWhere('schedule.date = :date', { date: query.date });
    } else if (query.tab) {
      const today = toDateString(new Date());
      const tomorrowDate = new Date();
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrow = toDateString(tomorrowDate);

      if (query.tab === 'today') {
        builder.andWhere('schedule.date = :today', { today });
      } else if (query.tab === 'tomorrow') {
        builder.andWhere('schedule.date = :tomorrow', { tomorrow });
      } else {
        builder.andWhere('schedule.date > :tomorrow', { tomorrow });
      }
    }

    if (query.serviceTypeCode) {
      builder.andWhere('schedule.service_type_code = :serviceTypeCode', {
        serviceTypeCode: query.serviceTypeCode,
      });
    }

    return builder.getMany();
  }

  async findOne(userId: string, id: string) {
    const schedule = await this.schedulesRepository.findOne({
      where: { id, userId },
      relations: ['customer', 'bookingGroup'],
    });
    if (!schedule) {
      throw new NotFoundException('排单不存在');
    }
    return schedule;
  }

  async create(userId: string, payload: CreateScheduleDto) {
    if (!isTimeRangeValid(payload.startTime, payload.endTime)) {
      throw new BadRequestException('结束时间必须晚于开始时间');
    }

    const serviceTypeCode = payload.serviceTypeCode
      ? await this.serviceTypesService.ensureUsableCode(payload.serviceTypeCode)
      : await this.getDefaultServiceTypeCodeByUserRole(userId);

    let bookingGroupId = payload.bookingGroupId ?? null;
    if (bookingGroupId) {
      const bookingGroup = await this.bookingGroupsRepository.findOne({
        where: { id: bookingGroupId },
      });
      if (!bookingGroup) {
        throw new NotFoundException('协同订单不存在');
      }
      if (bookingGroup.date !== payload.date) {
        throw new BadRequestException('协同订单日期与排单日期不一致');
      }
      bookingGroupId = bookingGroup.id;
    }

    if (payload.customerId && payload.temporaryCustomer) {
      throw new BadRequestException(
        '请选择已有客户或填写临时客户，不能同时提交',
      );
    }

    if (!payload.customerId && !payload.temporaryCustomer) {
      throw new BadRequestException('请先选择已有客户或填写临时客户信息');
    }

    const conflict = await this.findConflict(
      userId,
      payload.date,
      payload.startTime,
      payload.endTime,
    );
    if (conflict) {
      throw new ConflictException({
        message: '该时段已有排单',
        conflict,
      });
    }

    let customerId = payload.customerId;
    if (customerId) {
      const customer = await this.customersRepository.findOne({
        where: { id: customerId, userId },
      });
      if (!customer) {
        throw new NotFoundException('客户不存在');
      }
    } else if (payload.temporaryCustomer) {
      const temporaryCustomer = await this.findOrCreateTemporaryCustomer(
        userId,
        payload.temporaryCustomer,
        payload,
      );
      customerId = temporaryCustomer.id;
    }

    if (!customerId) {
      throw new BadRequestException('客户信息不完整，无法创建排单');
    }

    const setting = await this.settingsRepository.findOne({
      where: { userId },
    });
    const reminders = payload.reminders?.length
      ? payload.reminders
      : (setting?.defaultReminders ?? [
          ReminderType.ONE_DAY,
          ReminderType.ONE_HOUR,
        ]);

    const schedule = this.schedulesRepository.create({
      id: uuidv4(),
      userId,
      customerId,
      date: payload.date,
      startTime: payload.startTime,
      endTime: payload.endTime,
      location: payload.location,
      note: payload.note ?? '',
      serviceTypeCode,
      bookingGroupId,
      serviceMeta: payload.serviceMeta ?? null,
      depositStatus: payload.depositStatus,
      amount: payload.amount,
      reminders,
      referenceImages: payload.referenceImages ?? [],
    });
    return this.schedulesRepository.save(schedule);
  }

  private async findOrCreateTemporaryCustomer(
    userId: string,
    temporaryCustomer: NonNullable<CreateScheduleDto['temporaryCustomer']>,
    payload: CreateScheduleDto,
  ) {
    const typeCode = temporaryCustomer.type
      ? await this.customerTypesService.ensureUsableCode(temporaryCustomer.type)
      : await this.customerTypesService.getDefaultTypeCode();

    const exists = await this.customersRepository.findOne({
      where: {
        userId,
        phone: temporaryCustomer.phone,
      },
    });

    if (exists) {
      return exists;
    }

    const entity = this.customersRepository.create({
      id: uuidv4(),
      userId,
      name: temporaryCustomer.name,
      phone: temporaryCustomer.phone,
      isLongTerm: false,
      type: typeCode,
      style: '',
      hobby: '',
      specialNeed: payload.note ?? '',
      depositStatus: payload.depositStatus,
      tailPaymentDate: null,
      outfit: '',
      location: payload.location,
      companions: '',
      tags: ['临时客户'],
    });

    return this.customersRepository.save(entity);
  }

  async update(userId: string, id: string, payload: UpdateScheduleDto) {
    const schedule = await this.schedulesRepository.findOne({
      where: { id, userId },
    });
    if (!schedule) {
      throw new NotFoundException('排单不存在');
    }

    const nextDate = payload.date ?? schedule.date;
    const nextStart = payload.startTime ?? schedule.startTime;
    const nextEnd = payload.endTime ?? schedule.endTime;

    if (!isTimeRangeValid(nextStart, nextEnd)) {
      throw new BadRequestException('结束时间必须晚于开始时间');
    }

    if (payload.customerId && payload.customerId !== schedule.customerId) {
      const customer = await this.customersRepository.findOne({
        where: { id: payload.customerId, userId },
      });
      if (!customer) {
        throw new NotFoundException('客户不存在');
      }
    }

    if (payload.serviceTypeCode) {
      schedule.serviceTypeCode =
        await this.serviceTypesService.ensureUsableCode(
          payload.serviceTypeCode,
        );
    }

    if (payload.bookingGroupId) {
      const bookingGroup = await this.bookingGroupsRepository.findOne({
        where: { id: payload.bookingGroupId },
      });
      if (!bookingGroup) {
        throw new NotFoundException('协同订单不存在');
      }
      if (bookingGroup.date !== (payload.date ?? schedule.date)) {
        throw new BadRequestException('协同订单日期与排单日期不一致');
      }
      schedule.bookingGroupId = bookingGroup.id;
    }

    const conflict = await this.findConflict(
      userId,
      nextDate,
      nextStart,
      nextEnd,
      id,
    );
    if (conflict) {
      throw new ConflictException({
        message: '该时段已有排单',
        conflict,
      });
    }

    if (payload.referenceImages) {
      schedule.referenceImages = payload.referenceImages;
    }

    Object.assign(schedule, payload);
    return this.schedulesRepository.save(schedule);
  }

  async remove(userId: string, id: string) {
    const schedule = await this.schedulesRepository.findOne({
      where: { id, userId },
    });
    if (!schedule) {
      throw new NotFoundException('排单不存在');
    }
    await this.schedulesRepository.remove(schedule);
    return { success: true };
  }

  async history(userId: string, query: QueryHistoryDto) {
    const month = query.month ?? toDateString(new Date()).slice(0, 7);
    const builder = this.schedulesRepository
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.customer', 'customer')
      .where('schedule.user_id = :userId', { userId })
      .andWhere("DATE_FORMAT(schedule.date, '%Y-%m') = :month", { month })
      .orderBy('schedule.date', 'DESC')
      .addOrderBy('schedule.start_time', 'DESC');

    if (query.type) {
      builder.andWhere('customer.type = :type', { type: query.type });
    }

    if (query.serviceTypeCode) {
      builder.andWhere('schedule.service_type_code = :serviceTypeCode', {
        serviceTypeCode: query.serviceTypeCode,
      });
    }

    return builder.getMany();
  }

  private async findConflict(
    userId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeId?: string,
  ) {
    const schedules = await this.schedulesRepository.find({
      where: { userId, date },
      order: { startTime: 'ASC' },
    });

    return schedules.find((item) => {
      if (excludeId && item.id === excludeId) {
        return false;
      }
      return isTimeOverlap(item.startTime, item.endTime, startTime, endTime);
    });
  }

  private async getDefaultServiceTypeCodeByUserRole(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role === UserRole.MAKEUP_ARTIST) {
      return this.serviceTypesService.ensureUsableCode(ServiceTypeCode.MAKEUP);
    }

    return this.serviceTypesService.ensureUsableCode(
      ServiceTypeCode.PHOTOGRAPHY,
    );
  }
}
