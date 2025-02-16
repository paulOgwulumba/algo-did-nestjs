import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { AlgoDidService } from './algo-did.service';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DidDocument } from 'libs/interfaces/did.interface';
@ApiTags('AlgoDid')
@Controller('algo-did')
export class AlgoDidController {
  constructor(private readonly algoDidService: AlgoDidService) {}

  @ApiOperation({
    summary:
      'This resolves a given DID into its Did Document by manually checking the algorand network the server runs on',
  })
  @Get('resolve-did/:did')
  resolveDid(@Param('did') did: string) {
    return this.algoDidService.resolveDid(did);
  }

  @ApiOperation({
    summary:
      'This resolves a given DID into its Did Document by using a third party service',
  })
  @Get('resolve-did-external/:did')
  resolveDidExternal(@Param('did') did: string) {
    return this.algoDidService.resolveDidByApiCall(did);
  }

  @ApiOperation({
    summary:
      'This creates a new DID Document for a given address on the algorand network',
  })
  @Post('create-did/:address')
  createDid(@Param('address') address: string) {
    return this.algoDidService.createDid(address);
  }

  @ApiOperation({
    summary:
      'This updates an existing DID Document for a given DiD on the algorand network',
  })
  @Patch('update-did/:did')
  @ApiBody({ type: Object })
  updateDid(@Param('did') did: string, @Body() body: DidDocument) {
    return this.algoDidService.updateDidDocument(did, body);
  }

  @ApiOperation({
    summary:
      'This deletes an existing DID Document for a given DiD on the algorand network',
  })
  @Delete('delete-did/:did')
  deleteDid(@Param('did') did: string) {
    return this.algoDidService.deleteDid(did);
  }
}
