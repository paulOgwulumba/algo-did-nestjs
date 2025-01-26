import { Injectable } from '@nestjs/common';
import { AlgorandService } from 'libs/modules/algorand/algorand.service';

@Injectable()
export class AppService {
  constructor(private readonly algorandService: AlgorandService) {}

  getAccountInformation(address: string) {
    return this.algorandService.getAccountInformation(address);
  }
}
