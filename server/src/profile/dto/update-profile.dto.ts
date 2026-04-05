import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @Transform(({ value }) => String(value).trim())
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  nickname?: string;

  @IsOptional()
  @Transform(({ value }) => String(value).trim())
  @IsString()
  @MaxLength(255)
  avatarUrl?: string;

  @IsOptional()
  @Transform(({ value }) => String(value).trim())
  @IsString()
  @MaxLength(255)
  bio?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  portfolioImages?: string[];

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'number') {
      return value === 1;
    }
    if (typeof value === 'string') {
      return value === 'true' || value === '1';
    }
    return undefined;
  })
  @IsBoolean()
  portfolioPublic?: boolean;
}
