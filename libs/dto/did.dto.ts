import algosdk from 'algosdk';
import { AlgoDidClient } from 'libs/artifacts/algo-did-client';
import { DidMetadata } from 'libs/interfaces/did.interface';

export class UploadDidBoxDto {
  box: Buffer;
  boxIndexOffset: number;
  metadata: DidMetadata;
  appId: number;
  algoDidClient: AlgoDidClient;
  sender: {
    signer: algosdk.TransactionSigner;
    addr: string;
  };
  publicKey: Uint8Array;
}

export class MassUploadChunksDto {
  chunks: Buffer[];
  boxIndex: number;
  boxes: algosdk.BoxReference[];
  bytesOffset: number;
  appId: number;
  algoDidClient: AlgoDidClient;
  sender: {
    signer: algosdk.TransactionSigner;
    addr: string;
  };
  publicKey: Uint8Array;
}
