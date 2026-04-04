import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class QuerySchedulesDto {
  @IsOptional()
  @IsIn(['today', 'tomorrow', 'future'])
  tab?: 'today' | 'tomorrow' | 'future';

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9_-]{2,32}$/i)
  serviceTypeCode?: string;
}
