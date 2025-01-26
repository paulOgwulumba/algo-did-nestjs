import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { AlgorandService } from 'libs/modules/algorand/algorand.service';
import { AlgoDidModule } from 'libs/modules/algo-did/algo-did.module';
import { AlgoDidController } from 'libs/modules/algo-did/algo-did.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), AlgoDidModule],
  controllers: [AppController, AlgoDidController],
  providers: [AppService, AlgorandService],
})
export class AppModule {}
