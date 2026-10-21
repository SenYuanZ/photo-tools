import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PublicBookingController } from '../src/public-booking/public-booking.controller';
import { PublicBookingService } from '../src/public-booking/public-booking.service';

jest.mock('uuid', () => ({ v4: () => 'generated-id' }));

describe('public provider link endpoints', () => {
  let app: INestApplication<App>;
  const getProvider = jest.fn();
  const createBooking = jest.fn();
  const id = '3daf78e0-2ebd-4af9-b389-f14cdd7a6b87';

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [PublicBookingController],
      providers: [
        {
          provide: PublicBookingService,
          useValue: { getProvider, createBooking },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows an anonymous customer to resolve a provider', async () => {
    getProvider.mockResolvedValue({
      id,
      nickname: '服务者',
      roles: ['videographer'],
    });
    const response = await request(app.getHttpServer())
      .get(`/api/public/providers/${id}`)
      .expect(200);
    expect((response.body as { id: string }).id).toBe(id);
    expect(getProvider).toHaveBeenCalledWith(id);
  });
  it('rejects a malformed provider id before querying', async () => {
    await request(app.getHttpServer())
      .get('/api/public/providers/not-an-id')
      .expect(400);
    expect(getProvider).not.toHaveBeenCalled();
  });
  it('keeps public booking submission anonymous and forwards selected provider and role', async () => {
    createBooking.mockResolvedValue({ success: true });
    await request(app.getHttpServer())
      .post('/api/public/bookings')
      .send({
        modelName: '客户',
        modelPhone: '13800000000',
        date: '2027-01-01',
        customerTypeCode: 'personal',
        location: '工作室',
        items: [
          {
            providerId: id,
            serviceTypeCode: 'photography',
            serviceRoleCodes: ['videographer'],
            startTime: '10:00',
            endTime: '11:00',
          },
        ],
      })
      .expect(201);
    expect(createBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            providerId: id,
            serviceRoleCodes: ['videographer'],
          }),
        ],
      }),
    );
  });
});
