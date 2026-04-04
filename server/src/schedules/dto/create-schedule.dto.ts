import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { DepositStatus, ReminderType } from '../../common/enums/app.enums';

class TemporaryCustomerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @Transform(({ value }) => String(value).trim())
  @Matches(/^1[3-9]\d{9}$/)
  phone: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9_-]{2,32}$/i)
  type?: string;
}

export class CreateScheduleDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => TemporaryCustomerDto)
  temporaryCustomer?: TemporaryCustomerDto;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9_-]{2,32}$/i)
  serviceTypeCode?: string;

  @IsOptional()
  @IsString()
  bookingGroupId?: string;

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

  @IsOptional()
  @IsObject()
  serviceMeta?: Record<string, unknown>;
}
