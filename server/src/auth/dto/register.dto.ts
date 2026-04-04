import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../common/enums/app.enums';

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
  @IsEnum(UserRole)
  role?: UserRole;
}
