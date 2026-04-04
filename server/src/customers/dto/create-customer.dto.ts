import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  Matches,
  IsString,
  MaxLength,
} from 'class-validator';
import { DepositStatus } from '../../common/enums/app.enums';

export class CreateCustomerDto {
  @IsString()
  @MaxLength(64)
  name: string;

  @Transform(({ value }) => String(value).trim())
  @Matches(/^1[3-9]\d{9}$/)
  phone: string;

  @IsString()
  @MaxLength(32)
  type: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      return value === 'true';
    }
    if (typeof value === 'number') {
      return value === 1;
    }
    return undefined;
  })
  @IsBoolean()
  isLongTerm?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  style?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  hobby?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  specialNeed?: string;

  @IsEnum(DepositStatus)
  depositStatus: DepositStatus;

  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  })
  @IsOptional()
  @IsDateString()
  tailPaymentDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  outfit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  companions?: string;

  @IsOptional()
  @IsArray()
  @Transform(({ value }: { value: unknown }) => {
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .map((item) => String(item))
      .filter((item) => item.trim().length > 0);
  })
  tags?: string[];
}
