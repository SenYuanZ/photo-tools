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
import { QueryPublicOrdersDto } from './dto/query-public-orders.dto';

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
      const matched = await this.providerSupportsRole(
        provider.id,
        provider.role,
        expectedRole,
      );
      if (!matched) {
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
          ? await this.serviceTypesService.ensureUsableCode(
              item.serviceTypeCode,
            )
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
          const matched = await this.providerSupportsRole(
            provider.id,
            provider.role,
            expectedRole,
          );
          if (!matched) {
            throw new BadRequestException('服务者与服务类型不匹配');
          }
        }

        if (!item.referenceImages) {
          item.referenceImages = [];
        }

        return {
          ...item,
          serviceTypeCode:
            serviceTypeCode ??
            this.resolveServiceTypeByProviderRole(provider.role),
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
        companions: payload.companions ?? '',
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

  async queryOrders(query: QueryPublicOrdersDto) {
    if (query.bookingGroupId) {
      const detail = await this.getOrderDetailByGroupId(query.bookingGroupId);
      return {
        mode: 'bookingGroupId',
        total: 1,
        orders: [detail],
      };
    }

    if (!query.modelPhone && !query.modelName) {
      throw new BadRequestException('请输入订单编号，或输入手机号/客户昵称');
    }

    const schedulesBuilder = this.schedulesRepository
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.customer', 'customer')
      .leftJoinAndSelect('schedule.user', 'user')
      .where('schedule.display_status = :visible', { visible: DISPLAY_VISIBLE })
      .andWhere('customer.display_status = :visible', {
        visible: DISPLAY_VISIBLE,
      })
      .orderBy('schedule.date', 'DESC')
      .addOrderBy('schedule.start_time', 'DESC');

    if (query.modelPhone) {
      schedulesBuilder.andWhere('customer.phone = :modelPhone', {
        modelPhone: query.modelPhone,
      });
    }

    if (query.modelName) {
      schedulesBuilder.andWhere('customer.name LIKE :modelName', {
        modelName: `%${query.modelName}%`,
      });
    }

    const matchedSchedules = await schedulesBuilder.getMany();

    const groupIdSet = new Set(
      matchedSchedules
        .map((item) => item.bookingGroupId)
        .filter((item): item is string => Boolean(item)),
    );

    const groups = groupIdSet.size
      ? await this.bookingGroupsRepository.find({
          where: Array.from(groupIdSet).map((id) => ({
            id,
            displayStatus: DISPLAY_VISIBLE,
          })),
          relations: {
            schedules: {
              user: true,
              customer: true,
            },
          },
          order: {
            createdAt: 'DESC',
          },
        })
      : [];

    const groupedOrders = groups.map((group) => this.formatOrderDetail(group));
    const ungroupedOrders = matchedSchedules
      .filter((item) => !item.bookingGroupId)
      .map((item) => this.formatSingleScheduleOrder(item));

    const orders = [...groupedOrders, ...ungroupedOrders].sort(
      (left, right) =>
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime(),
    );

    return {
      mode: 'customer',
      total: orders.length,
      orders,
    };
  }

  private async getOrderDetailByGroupId(bookingGroupId: string) {
    const group = await this.bookingGroupsRepository.findOne({
      where: {
        id: bookingGroupId,
        displayStatus: DISPLAY_VISIBLE,
      },
      relations: {
        schedules: {
          user: true,
          customer: true,
        },
      },
      order: {
        schedules: {
          startTime: 'ASC',
        },
      },
    });

    if (!group) {
      const schedule = await this.schedulesRepository.findOne({
        where: {
          id: bookingGroupId,
          displayStatus: DISPLAY_VISIBLE,
        },
        relations: {
          user: true,
          customer: true,
        },
      });

      if (!schedule) {
        throw new NotFoundException('未找到该订单，请核对订单编号');
      }

      return this.formatSingleScheduleOrder(schedule);
    }

    return this.formatOrderDetail(group);
  }

  private formatSingleScheduleOrder(schedule: Schedule) {
    return {
      bookingGroupId: schedule.id,
      date: schedule.date,
      modelName: schedule.customer?.name || '',
      modelPhone: schedule.customer?.phone || '',
      location: schedule.location,
      note: schedule.note,
      createdAt: schedule.createdAt,
      bookings: [
        {
          bookingId: schedule.id,
          serviceTypeCode: schedule.serviceTypeCode,
          providerId: schedule.userId,
          providerName: schedule.user?.nickname || '',
          customerId: schedule.customerId,
          customerName: schedule.customer?.name || '',
          customerPhone: schedule.customer?.phone || '',
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          location: schedule.location,
          note: schedule.note,
          depositStatus: schedule.depositStatus,
          amount: schedule.amount,
          referenceImages: normalizeUploadUrls(schedule.referenceImages),
        },
      ],
    };
  }

  private formatOrderDetail(group: BookingGroup) {
    const schedules = (group.schedules || [])
      .filter((item) => item.displayStatus === DISPLAY_VISIBLE)
      .sort((left, right) => left.startTime.localeCompare(right.startTime));

    return {
      bookingGroupId: group.id,
      date: group.date,
      modelName: group.modelName,
      modelPhone: group.modelPhone,
      location: group.location,
      note: group.note,
      createdAt: group.createdAt,
      bookings: schedules.map((item) => ({
        bookingId: item.id,
        serviceTypeCode: item.serviceTypeCode,
        providerId: item.userId,
        providerName: item.user?.nickname || '',
        customerId: item.customerId,
        customerName: item.customer?.name || '',
        customerPhone: item.customer?.phone || '',
        startTime: item.startTime,
        endTime: item.endTime,
        location: item.location,
        note: item.note,
        depositStatus: item.depositStatus,
        amount: item.amount,
        referenceImages: normalizeUploadUrls(item.referenceImages),
      })),
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
    if (role === 'makeup_artist') {
      return 'makeup';
    }

    return 'photography';
  }

  private async providerSupportsRole(
    userId: string,
    primaryRole: string,
    expectedRole: UserRole,
  ) {
    if (primaryRole === String(expectedRole)) {
      return true;
    }

    const assignment = await this.userRolesRepository.findOne({
      where: {
        userId,
        roleCode: expectedRole,
      },
      select: {
        id: true,
      },
    });

    return Boolean(assignment);
  }

  private async findOrCreateCustomer(payload: {
    providerId: string;
    modelName: string;
    modelPhone: string;
    location: string;
    requirement: string;
    customerTypeCode: string;
    companions: string;
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
        companions: payload.companions,
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
      companions: payload.companions,
      tags: ['模特自助预约'],
    });

    return this.customersRepository.save(entity);
  }
}
