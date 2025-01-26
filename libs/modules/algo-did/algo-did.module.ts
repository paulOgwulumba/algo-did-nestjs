import { Module } from '@nestjs/common';
import { AlgoDidService } from './algo-did.service';
import { AlgoDidController } from './algo-did.controller';
import { AlgorandService } from '../algorand/algorand.service';

@Module({
  providers: [AlgoDidService, AlgorandService],
  controllers: [AlgoDidController],
  exports: [AlgoDidService],
})
export class AlgoDidModule {}
