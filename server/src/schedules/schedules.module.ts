import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerTypesModule } from '../customer-types/customer-types.module';
import { BookingGroup } from '../database/entities/booking-group.entity';
import { Customer } from '../database/entities/customer.entity';
import { Schedule } from '../database/entities/schedule.entity';
import { UserSetting } from '../database/entities/user-setting.entity';
import { User } from '../database/entities/user.entity';
import { ServiceTypesModule } from '../service-types/service-types.module';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Schedule,
      Customer,
      UserSetting,
      BookingGroup,
      User,
    ]),
    CustomerTypesModule,
    ServiceTypesModule,
  ],
  controllers: [SchedulesController],
  providers: [SchedulesService],
  exports: [SchedulesService],
})
export class SchedulesModule {}
