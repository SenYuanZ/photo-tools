import { IsOptional, IsString } from 'class-validator';

export class QueryCustomersDto {
  @IsOptional()
  @IsString()
  keyword?: string;
}
