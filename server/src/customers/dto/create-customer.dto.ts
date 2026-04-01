import { Transform } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  Matches,
  IsString,
  MaxLength,
} from 'class-validator';
import { CustomerType, DepositStatus } from '../../common/enums/app.enums';

export class CreateCustomerDto {
  @IsString()
  @MaxLength(64)
  name: string;

  @Transform(({ value }) => String(value).trim())
  @Matches(/^1[3-9]\d{9}$/)
  phone: string;

  @IsEnum(CustomerType)
  type: CustomerType;

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
