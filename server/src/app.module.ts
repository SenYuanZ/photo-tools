import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { Customer } from './database/entities/customer.entity';
import { InviteCode } from './database/entities/invite-code.entity';
import { Schedule } from './database/entities/schedule.entity';
import { UserSetting } from './database/entities/user-setting.entity';
import { User } from './database/entities/user.entity';
import { SeedService } from './database/seed.service';
import { DashboardModule } from './dashboard/dashboard.module';
import { PublicBookingModule } from './public-booking/public-booking.module';
import { CustomersModule } from './customers/customers.module';
import { InviteCodesModule } from './invite-codes/invite-codes.module';
import { SchedulesModule } from './schedules/schedules.module';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql' as const,
        host: configService.get<string>('DB_HOST', '127.0.0.1'),
        port: Number(configService.get<string>('DB_PORT', '3306')),
        username: configService.get<string>('DB_USERNAME', 'root'),
        password: configService.get<string>('DB_PASSWORD', 'admin123'),
        database: configService.get<string>('DB_NAME', 'photo_order'),
        entities: [User, UserSetting, Customer, Schedule, InviteCode],
        synchronize: true,
        logging: false,
        charset: 'utf8mb4',
        collation: 'utf8mb4_unicode_ci',
        extra: {
          dateStrings: true,
        },
      }),
    }),
    TypeOrmModule.forFeature([
      User,
      UserSetting,
      Customer,
      Schedule,
      InviteCode,
    ]),
    AuthModule,
    DashboardModule,
    PublicBookingModule,
    InviteCodesModule,
    CustomersModule,
    SchedulesModule,
    SettingsModule,
  ],
  controllers: [AppController],
  providers: [AppService, SeedService],
})
export class AppModule {}
