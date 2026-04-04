import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

export class QueryPublicAvailabilityDto {
  @IsOptional()
  @IsUUID()
  photographerId?: string;

  @IsOptional()
  @IsUUID()
  providerId?: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9_-]{2,32}$/i)
  serviceTypeCode?: string;
}
