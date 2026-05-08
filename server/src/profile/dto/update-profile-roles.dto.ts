import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class UpdateProfileRolesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @Matches(/^[a-z0-9_-]{2,32}$/i, { each: true })
  roleCodes: string[];

  @IsOptional()
  @Type(() => String)
  @IsString()
  @Matches(/^[a-z0-9_-]{2,32}$/i)
  primaryRoleCode?: string;
}
