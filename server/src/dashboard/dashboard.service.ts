import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../database/entities/customer.entity';
import { Schedule } from '../database/entities/schedule.entity';

const formatDate = (date: Date) => date.toISOString().slice(0, 10);
const DISPLAY_VISIBLE = 'Y';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Customer)
    private readonly customersRepository: Repository<Customer>,
    @InjectRepository(Schedule)
    private readonly schedulesRepository: Repository<Schedule>,
  ) {}

  async overview(userId: string) {
    const today = new Date();
    const tomorrowDate = new Date(today);
    tomorrowDate.setDate(today.getDate() + 1);

    const todayText = formatDate(today);
    const tomorrowText = formatDate(tomorrowDate);
    const month = todayText.slice(0, 7);

    const [customerCount, todayCount, tomorrowCount, futureCount, monthCount] =
      await Promise.all([
        this.customersRepository.count({
          where: { userId, displayStatus: DISPLAY_VISIBLE },
        }),
        this.schedulesRepository.count({
          where: { userId, date: todayText, displayStatus: DISPLAY_VISIBLE },
        }),
        this.schedulesRepository.count({
          where: {
            userId,
            date: tomorrowText,
            displayStatus: DISPLAY_VISIBLE,
          },
        }),
        this.schedulesRepository
          .createQueryBuilder('schedule')
          .where('schedule.user_id = :userId', { userId })
          .andWhere('schedule.display_status = :visible', {
            visible: DISPLAY_VISIBLE,
          })
          .andWhere('schedule.date > :tomorrow', { tomorrow: tomorrowText })
          .getCount(),
        this.schedulesRepository
          .createQueryBuilder('schedule')
          .where('schedule.user_id = :userId', { userId })
          .andWhere('schedule.display_status = :visible', {
            visible: DISPLAY_VISIBLE,
          })
          .andWhere("DATE_FORMAT(schedule.date, '%Y-%m') = :month", { month })
          .getCount(),
      ]);

    return {
      customerCount,
      todayCount,
      tomorrowCount,
      futureCount,
      monthCount,
    };
  }
}
