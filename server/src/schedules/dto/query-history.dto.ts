import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class QueryHistoryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/)
  month?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  type?: string;
}
