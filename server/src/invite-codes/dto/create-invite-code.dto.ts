import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateInviteCodeDto {
  @Transform(({ value }) => String(value).trim().toUpperCase())
  @IsString()
  @MinLength(4)
  @MaxLength(32)
  code: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) {
      return null;
    }
    return Number(value);
  })
  @IsInt()
  @Min(1)
  maxUses?: number | null;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) {
      return undefined;
    }
    return String(value);
  })
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @Transform(({ value }) => String(value).trim())
  @IsString()
  @MaxLength(255)
  note?: string;
}
