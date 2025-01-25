import { Injectable } from '@nestjs/common';
import { AlgorandService } from 'libs/modules/algorand/algorand.service';

@Injectable()
export class AppService {
  constructor(private readonly algorandService: AlgorandService) {}

  getHello(): string {
    return 'Hello World!';
  }

  getTransactionGroupInfo(txnGroup: string) {
    return this.algorandService.getTxnGroupInformation(txnGroup);
    // return this.algorandService.getAccountInformation(txnGroup);
  }
}
