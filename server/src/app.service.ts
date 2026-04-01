import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      message: 'photo-order api is running',
      timestamp: new Date().toISOString(),
    };
  }
}
