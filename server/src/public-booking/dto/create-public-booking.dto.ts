import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

const PUBLIC_BOOKING_THEME_TYPES = [
  'cosplay',
  'jk',
  'lolita',
  'hanfu',
  'daily',
  'other',
] as const;

const trimOptionalText = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null) return undefined;
  return typeof value === 'string' ? value.trim() : value;
};

const normalizeThemeType = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  return value.trim();
};

export class PublicBookingAiBriefDto {
  @IsOptional()
  @Transform(normalizeThemeType)
  @IsIn(PUBLIC_BOOKING_THEME_TYPES)
  themeType?: (typeof PUBLIC_BOOKING_THEME_TYPES)[number];

  @IsOptional()
  @Transform(trimOptionalText)
  @IsString()
  @MaxLength(255)
  workName?: string;

  @IsOptional()
  @Transform(trimOptionalText)
  @IsString()
  @MaxLength(255)
  characterName?: string;

  @IsOptional()
  @Transform(trimOptionalText)
  @IsString()
  @MaxLength(255)
  characterSetting?: string;

  @IsOptional()
  @Transform(trimOptionalText)
  @IsString()
  @MaxLength(255)
  outfit?: string;

  @IsOptional()
  @Transform(trimOptionalText)
  @IsString()
  @MaxLength(255)
  makeupHair?: string;

  @IsOptional()
  @Transform(trimOptionalText)
  @IsString()
  @MaxLength(255)
  props?: string;

  @IsOptional()
  @Transform(trimOptionalText)
  @IsString()
  @MaxLength(255)
  visualGoal?: string;

  @IsOptional()
  @Transform(trimOptionalText)
  @IsString()
  @MaxLength(255)
  posePreference?: string;

  @IsOptional()
  @Transform(trimOptionalText)
  @IsString()
  @MaxLength(255)
  avoid?: string;
}

class PublicBookingItemDto {
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9_-]{2,32}$/i)
  serviceTypeCode?: string;

  @IsUUID()
  providerId: string;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  startTime: string;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  endTime: string;

  @Transform(trimOptionalText)
  @IsOptional()
  @IsString()
  @MaxLength(255)
  requirement?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  referenceImages?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceRoleCodes?: string[];
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

  @IsString()
  @Matches(/^[a-z0-9_-]{2,32}$/i)
  customerTypeCode: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  companions?: string;

  @Transform(({ value }) => String(value).trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  location: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PublicBookingAiBriefDto)
  aiBrief?: PublicBookingAiBriefDto;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => PublicBookingItemDto)
  items: PublicBookingItemDto[];
}
