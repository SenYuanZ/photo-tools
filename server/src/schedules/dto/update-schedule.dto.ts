import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { ScheduleStatus } from '../../common/enums/app.enums';
import { CreateScheduleDto } from './create-schedule.dto';

export class UpdateScheduleDto extends PartialType(CreateScheduleDto) {
  @IsOptional()
  @IsEnum(ScheduleStatus)
  status?: ScheduleStatus;
}
