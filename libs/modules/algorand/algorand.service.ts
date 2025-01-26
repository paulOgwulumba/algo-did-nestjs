/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Algodv2, Kmd, mnemonicToSecretKey } from 'algosdk';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AlgorandService {
  algodClient: Algodv2;
  kmdClient: Kmd;

  private readonly logger = new Logger(AlgorandService.name);

  constructor(private readonly configService: ConfigService) {
    // Initialize Algod client
    const algodServer =
      this.configService.get<string>('ALGOD_SERVER') ||
      'https://testnet-api.algonode.cloud';
    const algodToken = this.configService.get<string>('ALGOD_TOKEN');
    const algodPort = this.configService.get<string>('ALGOD_PORT');
    this.algodClient = new Algodv2(algodToken, algodServer, algodPort);

    // Initialize Kmd client if credentials are provided
    const kmdServer = this.configService.get<string>('KMD_SERVER');
    const kmdToken = this.configService.get<string>('KMD_TOKEN');
    const kmdPort = this.configService.get<string>('KMD_PORT');

    this.kmdClient = new Kmd(kmdToken, kmdServer, kmdPort);
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

  async listWallets() {
    try {
      const wallets = await this.kmdClient.listWallets();
      return wallets;
    } catch (error) {
      this.logger.error(`Error listing KMD wallets: ${error}`);
      throw new InternalServerErrorException(error);
    }
  }

  loadMasterWallet() {
    return this.getWalletByMnemonic(
      this.configService.get<string>('MASTER_MNEMONIC'),
    );
  }

  getWalletByMnemonic(mnemonic: string) {
    try {
      const wallet = mnemonicToSecretKey(mnemonic);
      return wallet;
    } catch (error) {
      this.logger.error(`Error getting wallet: ${error}`);
      throw new InternalServerErrorException(error);
    }
  }
}
