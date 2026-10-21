import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PublicBookingService } from './public-booking.service';
import type { User } from '../database/entities/user.entity';
import type { CreatePublicBookingDto } from './dto/create-public-booking.dto';

jest.mock('uuid', () => ({ v4: () => 'generated-id' }));

describe('PublicBookingService provider links and role selection', () => {
  const users = { findOne: jest.fn() };
  const roles = { find: jest.fn(), findOne: jest.fn() };
  const customers = { findOne: jest.fn() };
  const schedules = { find: jest.fn() };
  const groups = { create: jest.fn(), save: jest.fn() };
  const scheduleService = { create: jest.fn() };
  const customerTypes = { ensureUsableCode: jest.fn() };
  const serviceTypes = { ensureUsableCode: jest.fn() };
  type Dependencies = ConstructorParameters<typeof PublicBookingService>;
  const service = new PublicBookingService(
    users as unknown as Dependencies[0],
    roles as unknown as Dependencies[1],
    customers as unknown as Dependencies[2],
    schedules as unknown as Dependencies[3],
    groups as unknown as Dependencies[4],
    scheduleService as unknown as Dependencies[5],
    customerTypes as unknown as Dependencies[6],
    serviceTypes as unknown as Dependencies[7],
  );
  const provider = {
    id: 'provider',
    nickname: '服务者',
    account: 'public-account',
    role: 'videographer',
    avatarUrl: '',
    bio: '',
    portfolioPublic: false,
    portfolioImages: ['/private.jpg'],
    password: 'never-public',
  } as User;
  const payload = (
    role = 'videographer',
    serviceTypeCode = 'photography',
  ): CreatePublicBookingDto => ({
    modelName: '客户',
    modelPhone: '13800000000',
    date: '2027-01-01',
    customerTypeCode: 'personal',
    location: '工作室',
    items: [
      {
        providerId: 'provider',
        serviceTypeCode,
        serviceRoleCodes: [role],
        startTime: '10:00',
        endTime: '11:00',
      },
    ],
  });

  beforeEach(() => {
    jest.resetAllMocks();
    users.findOne.mockResolvedValue(provider);
    roles.find.mockResolvedValue([
      { userId: 'provider', roleCode: 'videographer' },
      { userId: 'provider', roleCode: 'makeup_artist' },
    ]);
    serviceTypes.ensureUsableCode.mockImplementation((code: string) =>
      Promise.resolve(code),
    );
    customerTypes.ensureUsableCode.mockResolvedValue('personal');
    customers.findOne.mockResolvedValue({
      id: 'customer',
      displayStatus: 'Y',
      isLongTerm: true,
    });
    schedules.find.mockResolvedValue([]);
    groups.create.mockImplementation((value: unknown) => value);
    groups.save.mockResolvedValue({});
    scheduleService.create.mockResolvedValue({ id: 'schedule' });
  });

  it('resolves a visible user with only public fields and never returns private portfolio images', async () => {
    const result = await service.getProvider('provider');
    expect(users.findOne).toHaveBeenCalledWith({
      where: { id: 'provider', displayStatus: 'Y' },
    });
    expect(result.roles).toEqual(['videographer', 'makeup_artist']);
    expect(result.portfolioImages).toEqual([]);
    expect(result).not.toHaveProperty('password');
    provider.portfolioPublic = true;
    expect((await service.getProvider('provider')).portfolioImages).toEqual([
      '/private.jpg',
    ]);
    provider.portfolioPublic = false;
  });

  it('rejects missing or hidden users', async () => {
    users.findOne.mockResolvedValue(null);
    await expect(service.getProvider('hidden')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.createBooking(payload())).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(groups.save).not.toHaveBeenCalled();
  });

  it.each([
    ['videographer', 'photography'],
    ['makeup_artist', 'makeup'],
  ])(
    'registers the selected %s role to the actual provider',
    async (role, type) => {
      const result = await service.createBooking(payload(role, type));
      expect(scheduleService.create).toHaveBeenCalledWith(
        'provider',
        expect.objectContaining({
          customerId: 'customer',
          serviceTypeCode: type,
          serviceRoleCodes: [role],
        }),
      );
      expect(result.bookings[0].providerId).toBe('provider');
    },
  );

  it('rejects forged role ownership and mismatched categories before any writes', async () => {
    await expect(
      service.createBooking(payload('photographer')),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.createBooking(payload('makeup_artist', 'photography')),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(groups.save).not.toHaveBeenCalled();
    expect(scheduleService.create).not.toHaveBeenCalled();
  });

  it('preserves legacy clients without explicit service role codes', async () => {
    users.findOne.mockResolvedValue({ ...provider, role: 'photographer' });
    const input = payload();
    delete input.items[0].serviceRoleCodes;
    await service.createBooking(input);
    expect(scheduleService.create).toHaveBeenCalledWith(
      'provider',
      expect.objectContaining({ serviceTypeCode: 'photography' }),
    );
  });

  it('rejects occupied times before creating the booking group', async () => {
    schedules.find.mockResolvedValue([
      { startTime: '10:30', endTime: '11:30' },
    ]);
    await expect(service.createBooking(payload())).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(groups.save).not.toHaveBeenCalled();
  });
});
