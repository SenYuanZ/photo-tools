import { IsDateString, IsIn, IsOptional } from 'class-validator';

export class QuerySchedulesDto {
  @IsOptional()
  @IsIn(['today', 'tomorrow', 'future'])
  tab?: 'today' | 'tomorrow' | 'future';

  @IsOptional()
  @IsDateString()
  date?: string;
}
