import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from '../database/entities/customer.entity';
import { Schedule } from '../database/entities/schedule.entity';
import { User } from '../database/entities/user.entity';
import { SchedulesModule } from '../schedules/schedules.module';
import { PublicBookingController } from './public-booking.controller';
import { PublicBookingService } from './public-booking.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Customer, Schedule]),
    SchedulesModule,
  ],
  controllers: [PublicBookingController],
  providers: [PublicBookingService],
})
export class PublicBookingModule {}
