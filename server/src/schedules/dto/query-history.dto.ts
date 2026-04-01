import { IsIn, IsOptional, Matches } from 'class-validator';

export class QueryHistoryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/)
  month?: string;

  @IsOptional()
  @IsIn(['personal', 'couple', 'family', 'business', 'other'])
  type?: 'personal' | 'couple' | 'family' | 'business' | 'other';
}
