import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Algodv2 } from 'algosdk';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AlgorandService {
  algodClient: Algodv2;
  private readonly logger = new Logger(AlgorandService.name);

  constructor(private readonly configService: ConfigService) {
    const server =
      this.configService.get<string>('ALGOD_SERVER') ||
      'https://testnet-api.algonode.cloud';
    const token = {
      'X-API-Key': this.configService.get<string>('ALGOD_TOKEN'),
    };
    const port = this.configService.get<string>('ALGOD_PORT');

    this.algodClient = new Algodv2(token, server, port);
  }

  async getAccountInformation(address: string) {
    try {
      const accountInfo = await this.algodClient
        .accountInformation(address)
        .do();
      return accountInfo;
    } catch (error) {
      this.logger.error(
        `Error retrieving account information for address '${address}': ${error}`,
      );
      throw error;
    }
  }

  async getTxnGroupInformation(txnGroup: string) {
    // console.log(await this.algodClient.);
    try {
      const txnGroupInfo = await this.algodClient
        .getLedgerStateDeltaForTransactionGroup(txnGroup)
        .do();

      return txnGroupInfo;
    } catch (error) {
      this.logger.error(
        `Error retrieving transaction group information for group '${txnGroup}': ${error}`,
      );
      throw new InternalServerErrorException(error);
    }
  }
}
