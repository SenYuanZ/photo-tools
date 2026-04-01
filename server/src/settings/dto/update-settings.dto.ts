import { IsArray, IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { ReminderType, ThemeName } from '../../common/enums/app.enums';

export class UpdateSettingsDto {
  @IsOptional()
  @IsEnum(ThemeName)
  theme?: ThemeName;

  @IsOptional()
  @IsArray()
  @IsEnum(ReminderType, { each: true })
  defaultReminders?: ReminderType[];

  @IsOptional()
  @IsBoolean()
  backupEnabled?: boolean;
}
