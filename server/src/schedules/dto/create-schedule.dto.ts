import { Transform } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { DepositStatus, ReminderType } from '../../common/enums/app.enums';

export class CreateScheduleDto {
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsDateString()
  date: string;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  startTime: string;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  endTime: string;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsEnum(DepositStatus)
  depositStatus: DepositStatus;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsArray()
  @IsEnum(ReminderType, { each: true })
  reminders?: ReminderType[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  referenceImages?: string[];
}
