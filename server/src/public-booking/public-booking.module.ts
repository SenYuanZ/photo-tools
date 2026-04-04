import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerTypesModule } from '../customer-types/customer-types.module';
import { Customer } from '../database/entities/customer.entity';
import { Schedule } from '../database/entities/schedule.entity';
import { User } from '../database/entities/user.entity';
import { SchedulesModule } from '../schedules/schedules.module';
import { PublicBookingController } from './public-booking.controller';
import { PublicBookingService } from './public-booking.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Customer, Schedule]),
    CustomerTypesModule,
    SchedulesModule,
  ],
  controllers: [PublicBookingController],
  providers: [PublicBookingService],
})
export class PublicBookingModule {}
