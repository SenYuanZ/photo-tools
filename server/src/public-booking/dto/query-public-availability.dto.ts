import { IsDateString, IsUUID } from 'class-validator';

export class QueryPublicAvailabilityDto {
  @IsUUID()
  photographerId: string;

  @IsDateString()
  date: string;
}
