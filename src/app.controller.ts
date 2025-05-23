import { Controller, Get, Param } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('account-info/:address')
  getAccountInfo(@Param('address') address: string) {
    return this.appService.getAccountInformation(address);
  }
}
