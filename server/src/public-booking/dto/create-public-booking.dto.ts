import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

class PublicBookingItemDto {
  @IsString()
  @Matches(/^[a-z0-9_-]{2,32}$/i)
  serviceTypeCode: string;

  @IsUUID()
  providerId: string;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  startTime: string;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  endTime: string;

  @Transform(({ value }) => String(value).trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  requirement: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  referenceImages?: string[];
}

export class CreatePublicBookingDto {
  @Transform(({ value }) => String(value).trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  modelName: string;

  @Transform(({ value }) => String(value).trim())
  @Matches(/^1[3-9]\d{9}$/)
  modelPhone: string;

  @IsDateString()
  date: string;

  @Transform(({ value }) => String(value).trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  location: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @ValidateNested({ each: true })
  @Type(() => PublicBookingItemDto)
  items: PublicBookingItemDto[];
}
