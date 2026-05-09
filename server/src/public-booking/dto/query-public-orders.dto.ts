import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class QueryPublicOrdersDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Transform(({ value }) => {
    if (value === null || value === undefined) {
      return undefined;
    }
    const text = String(value).trim();
    return text ? text : undefined;
  })
  bookingGroupId?: string;

  @IsOptional()
  @Matches(/^1[3-9]\d{9}$/)
  @Transform(({ value }) => {
    if (value === null || value === undefined) {
      return undefined;
    }
    const text = String(value).trim();
    return text ? text : undefined;
  })
  modelPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Transform(({ value }) => {
    if (value === null || value === undefined) {
      return undefined;
    }
    const text = String(value).trim();
    return text ? text : undefined;
  })
  modelName?: string;
}
