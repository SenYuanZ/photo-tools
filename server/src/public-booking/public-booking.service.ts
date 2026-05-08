import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { DepositStatus, UserRole } from '../common/enums/app.enums';
import { CustomerTypesService } from '../customer-types/customer-types.service';
import { BookingGroup } from '../database/entities/booking-group.entity';
import { Customer } from '../database/entities/customer.entity';
import { Schedule } from '../database/entities/schedule.entity';
import { UserRoleAssignment } from '../database/entities/user-role.entity';
import { User } from '../database/entities/user.entity';
import { ServiceTypesService } from '../service-types/service-types.service';
import { SchedulesService } from '../schedules/schedules.service';
import { isTimeOverlap } from '../common/utils/time.util';
import {
  normalizeUploadUrl,
  normalizeUploadUrls,
} from '../common/utils/upload-url.util';
import { CreatePublicBookingDto } from './dto/create-public-booking.dto';

const STEP_MINUTES = 30;
const DISPLAY_VISIBLE = 'Y';
const DISPLAY_HIDDEN = 'N';

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
    @InjectRepository(UserRoleAssignment)
    private readonly userRolesRepository: Repository<UserRoleAssignment>,
    @InjectRepository(Customer)
    private readonly customersRepository: Repository<Customer>,
    @InjectRepository(Schedule)
    private readonly schedulesRepository: Repository<Schedule>,
    @InjectRepository(BookingGroup)
    private readonly bookingGroupsRepository: Repository<BookingGroup>,
    private readonly schedulesService: SchedulesService,
    private readonly customerTypesService: CustomerTypesService,
    private readonly serviceTypesService: ServiceTypesService,
  ) {}

  async listProviders(serviceTypeCode?: string, roleCode?: string) {
    let role: UserRole | undefined;
    if (serviceTypeCode) {
      role = this.resolveRoleByServiceType(serviceTypeCode);
    }

    const targetRoleCode = roleCode?.trim() || role;

    const builder = this.usersRepository
      .createQueryBuilder('user')
      .where('user.display_status = :visible', { visible: DISPLAY_VISIBLE })
      .orderBy('user.created_at', 'ASC');

    if (targetRoleCode) {
      builder
        .innerJoin(
          UserRoleAssignment,
          'userRole',
          'userRole.user_id = user.id AND userRole.role_code = :roleCode',
          { roleCode: targetRoleCode },
        )
        .distinct(true);
    }

    const users = await builder.getMany();
    const userIds = users.map((item) => item.id);
    const assignments = userIds.length
      ? await this.userRolesRepository.find({
          where: userIds.map((userId) => ({ userId })),
          order: { isPrimary: 'DESC', createdAt: 'ASC' },
        })
      : [];
    const roleMap = new Map<string, string[]>();
    assignments.forEach((item) => {
      const list = roleMap.get(item.userId) ?? [];
      list.push(item.roleCode);
      roleMap.set(item.userId, list);
    });

    return users.map((user) => ({
      id: user.id,
      nickname: user.nickname,
      account: user.account,
      role: user.role,
      roles: roleMap.get(user.id) ?? [user.role],
      avatarUrl: normalizeUploadUrl(user.avatarUrl),
      bio: user.bio || '',
      portfolioPublic: Boolean(user.portfolioPublic),
      portfolioImages: user.portfolioPublic
        ? normalizeUploadUrls(user.portfolioImages)
        : [],
    }));
  }

  async listServiceTypes() {
    return this.serviceTypesService.findAllActive();
  }

  async listCustomerTypes() {
    return this.customerTypesService.findAllActive();
  }

  async getAvailability(
    providerId: string,
    date: string,
    serviceTypeCode?: string,
  ) {
    const provider = await this.usersRepository.findOne({
      where: { id: providerId, displayStatus: DISPLAY_VISIBLE },
      select: {
        id: true,
        role: true,
      },
    });

    if (!provider) {
      throw new NotFoundException('服务者不存在，请重新选择');
    }

    if (serviceTypeCode) {
      const expectedRole = this.resolveRoleByServiceType(serviceTypeCode);
      if (provider.role !== expectedRole) {
        throw new BadRequestException('服务者与服务类型不匹配');
      }
    }

    const schedules = await this.schedulesRepository.find({
      where: {
        userId: providerId,
        date,
        displayStatus: DISPLAY_VISIBLE,
        ...(serviceTypeCode ? { serviceTypeCode } : {}),
      },
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
      providerId,
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
    const normalizedItems = await Promise.all(
      payload.items.map(async (item) => {
        const serviceTypeCode = item.serviceTypeCode
          ? await this.serviceTypesService.ensureUsableCode(item.serviceTypeCode)
          : undefined;

        const provider = await this.usersRepository.findOne({
          where: { id: item.providerId, displayStatus: DISPLAY_VISIBLE },
          select: {
            id: true,
            nickname: true,
            role: true,
          },
        });

        if (!provider) {
          throw new NotFoundException('服务者不存在，请重新选择');
        }

        if (serviceTypeCode) {
          const expectedRole = this.resolveRoleByServiceType(serviceTypeCode);
          if (provider.role !== expectedRole) {
            throw new BadRequestException('服务者与服务类型不匹配');
          }
        }

        if (!item.referenceImages) {
          item.referenceImages = [];
        }

        return {
          ...item,
          serviceTypeCode: serviceTypeCode ?? this.resolveServiceTypeByProviderRole(provider.role),
          provider,
        };
      }),
    );

    for (const item of normalizedItems) {
      const schedules = await this.schedulesRepository.find({
        where: {
          userId: item.provider.id,
          date: payload.date,
          displayStatus: DISPLAY_VISIBLE,
        },
        order: {
          startTime: 'ASC',
        },
      });

      const conflict = schedules.find((current) =>
        isTimeOverlap(
          current.startTime,
          current.endTime,
          item.startTime,
          item.endTime,
        ),
      );

      if (conflict) {
        throw new ConflictException({
          message: '该时段已有排单',
          conflict,
          serviceTypeCode: item.serviceTypeCode,
        });
      }
    }

    const bookingGroup = this.bookingGroupsRepository.create({
      id: uuidv4(),
      date: payload.date,
      modelName: payload.modelName,
      modelPhone: payload.modelPhone,
      location: payload.location,
      note: payload.note ?? '',
      createdBy: normalizedItems[0].provider.id,
    });
    await this.bookingGroupsRepository.save(bookingGroup);

    const bookings = [] as Array<{
      serviceTypeCode: string;
      bookingId: string;
      providerId: string;
      providerName: string;
    }>;

    for (const item of normalizedItems) {
      const customer = await this.findOrCreateCustomer({
        providerId: item.provider.id,
        modelName: payload.modelName,
        modelPhone: payload.modelPhone,
        location: payload.location,
        requirement: item.requirement,
        customerTypeCode: payload.customerTypeCode,
      });

      const schedule = await this.schedulesService.create(item.provider.id, {
        customerId: customer.id,
        date: payload.date,
        startTime: item.startTime,
        endTime: item.endTime,
        location: payload.location,
        note: item.requirement,
        referenceImages: item.referenceImages ?? [],
        depositStatus: DepositStatus.UNPAID,
        amount: 0,
        serviceTypeCode: item.serviceTypeCode,
        bookingGroupId: bookingGroup.id,
        serviceMeta: {
          source: 'public-model-booking',
        },
      });

      bookings.push({
        serviceTypeCode: item.serviceTypeCode,
        bookingId: schedule.id,
        providerId: item.provider.id,
        providerName: item.provider.nickname,
      });
    }

    return {
      success: true,
      bookingGroupId: bookingGroup.id,
      bookings,
    };
  }

  private resolveRoleByServiceType(serviceTypeCode: string) {
    if (serviceTypeCode === 'photography') {
      return UserRole.PHOTOGRAPHER;
    }

    if (serviceTypeCode === 'makeup') {
      return UserRole.MAKEUP_ARTIST;
    }

    throw new BadRequestException('暂不支持该服务类型');
  }

  private resolveServiceTypeByProviderRole(role: string) {
    if (role === UserRole.MAKEUP_ARTIST) {
      return 'makeup';
    }

    return 'photography';
  }

  private async findOrCreateCustomer(payload: {
    providerId: string;
    modelName: string;
    modelPhone: string;
    location: string;
    requirement: string;
    customerTypeCode: string;
  }) {
    const normalizedTypeCode = await this.customerTypesService.ensureUsableCode(
      payload.customerTypeCode,
    );

    const existingCustomer = await this.customersRepository.findOne({
      where: {
        userId: payload.providerId,
        phone: payload.modelPhone,
      },
    });

    if (existingCustomer?.displayStatus === DISPLAY_VISIBLE) {
      if (
        existingCustomer.isLongTerm === false &&
        existingCustomer.type !== normalizedTypeCode
      ) {
        existingCustomer.type = normalizedTypeCode;
        await this.customersRepository.save(existingCustomer);
      }
      return existingCustomer;
    }

    if (existingCustomer?.displayStatus === DISPLAY_HIDDEN) {
      Object.assign(existingCustomer, {
        name: payload.modelName,
        isLongTerm: false,
        type: normalizedTypeCode,
        style: '',
        hobby: '',
        specialNeed: payload.requirement,
        depositStatus: DepositStatus.UNPAID,
        tailPaymentDate: null,
        outfit: '',
        location: payload.location,
        companions: '',
        tags: ['模特自助预约'],
        displayStatus: DISPLAY_VISIBLE,
      });

      return this.customersRepository.save(existingCustomer);
    }

    const entity = this.customersRepository.create({
      id: uuidv4(),
      userId: payload.providerId,
      name: payload.modelName,
      phone: payload.modelPhone,
      isLongTerm: false,
      type: normalizedTypeCode,
      style: '',
      hobby: '',
      specialNeed: payload.requirement,
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
