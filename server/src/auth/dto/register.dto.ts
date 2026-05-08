import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @Transform(({ value }) => String(value).trim())
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(32)
  @Matches(/^[a-zA-Z0-9_]+$/)
  account: string;

  @Transform(({ value }) => String(value).trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  nickname: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(64)
  password: string;

  @Transform(({ value }) => String(value).trim().toUpperCase())
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(32)
  inviteCode: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9_-]{2,32}$/i)
  role?: string;
}
