import { Transform } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreatePublicBookingDto {
  @IsUUID()
  photographerId: string;

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

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  startTime: string;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  endTime: string;

  @Transform(({ value }) => String(value).trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  location: string;

  @Transform(({ value }) => String(value).trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  poseRequirement: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  referenceImages?: string[];
}
