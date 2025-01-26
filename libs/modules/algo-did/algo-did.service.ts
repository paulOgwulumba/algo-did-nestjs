/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { AlgorandService } from '../algorand/algorand.service';
import { AlgoDidClient } from 'libs/artifacts/algo-did-client';
import * as algokit from '@algorandfoundation/algokit-utils';
import axios from 'axios';
import algosdk from 'algosdk';
import { DidDocument, DidMetadata } from 'libs/interfaces/did.interface';
import { calculateTotalCostOfUploadingDidDocument } from 'libs/utils/calculate-cost-of-uploading-did-document';
import { BYTES_PER_CALL, MAX_BOX_SIZE } from 'libs/constants/algo-did.constant';
import { MassUploadChunksDto, UploadDidBoxDto } from 'libs/dto/did.dto';
import { resolveDidIntoComponents } from 'libs/utils/resolve-did-into-components';
import { AlgoDIDStatus } from 'libs/enums/algo-did.enum';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AlgoDidService {
  private readonly logger = new Logger(AlgoDidService.name);

  constructor(
    private readonly algorandService: AlgorandService,
    private readonly configService: ConfigService,
  ) {}

  test() {
    return this.algorandService.loadMasterWallet();
  }

  async deployDidContract() {
    const sender = this.algorandService.loadMasterWallet();
    const appClient = new AlgoDidClient(
      {
        resolveBy: 'id',
        id: 0,
        sender,
      },
      this.algorandService.algodClient,
    );

    try {
      this.logger.log('Deploying DID contract...');
      const response = await appClient.create.createApplication({});
      this.logger.log(
        `DID contract deployed successfully. App ID: ${response.appId}. Txn ID: ${response.transaction?.txID()}`,
      );
      return {
        appId: response.appId,
        txId: response.transaction?.txID(),
        appAddress: response.appAddress,
      };
    } catch (error) {
      this.logger.error(`Error deploying DID contract: ${error}`);
      throw error;
    }
  }

  createDidDocument(appId: number, didOwnerAddress: string) {
    this.logger.log(`Creating DID document for address: ${didOwnerAddress}`);

    // Get address public key
    const publicKey = algosdk.decodeAddress(didOwnerAddress).publicKey;
    const publicKeyHex = Buffer.from(publicKey).toString('hex');

    // Generate the base identifier (DID)
    const network = this.configService.get<string>('NETWORK');
    const subject = `${network}:app:${appId}:${publicKeyHex}`;
    const did = `did:algo:${subject}`;

    const didDocument: DidDocument = {
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1',
        'https://w3id.org/security/suites/x25519-2020/v1',
      ],
      id: did,
      verificationMethod: [
        {
          id: `${did}#master`,
          type: 'Ed25519VerificationKey2020',
          controller: did,
        },
      ],
      authentication: [`${did}#master`],
    };

    this.logger.log('DID document created successfully');

    return didDocument;
  }

  async startDidDocumentUpload(
    appId: number,
    didOwnerAddress: string,
    didDocument: DidDocument,
  ) {
    this.logger.log(
      `Prepping DID document upload for address: ${didOwnerAddress}`,
    );

    try {
      const sender = this.algorandService.loadMasterWallet();
      const documentBuffer = Buffer.from(JSON.stringify(didDocument));

      const appClient = new AlgoDidClient(
        {
          resolveBy: 'id',
          id: Number(appId),
          sender,
        },
        this.algorandService.algodClient,
      );

      const { totalCost, numberOfBoxes, endBoxSize } =
        calculateTotalCostOfUploadingDidDocument(documentBuffer);

      const appAddress = (await appClient.appClient.getAppReference())
        .appAddress;
      const publicKey = algosdk.decodeAddress(didOwnerAddress).publicKey;

      const mbrPayment = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: sender.addr,
        to: appAddress,
        amount: totalCost,
        suggestedParams: await this.algorandService.algodClient
          .getTransactionParams()
          .do(),
      });

      const response = await appClient.startUpload(
        {
          pubKey: didOwnerAddress,
          numBoxes: numberOfBoxes,
          endBoxSize: endBoxSize,
          mbrPayment,
        },
        {
          sendParams: {
            suppressLog: true,
          },
          boxes: [
            {
              appIndex: Number(appId),
              name: publicKey,
            },
          ],
        },
      );

      this.logger.log('DID document prepped for upload successfully');
      return response;
    } catch (error) {
      this.logger.error(`Error starting DID document upload: ${error}`);
      throw error;
    }
  }

  async uploadDidDocument(
    appId: number,
    didOwnerAddress: string,
    didDocument: DidDocument,
  ) {
    this.logger.log(`Uploading DID document for address: ${didOwnerAddress}`);

    try {
      const sender = this.algorandService.loadMasterWallet();
      const appClient = new AlgoDidClient(
        {
          resolveBy: 'id',
          id: Number(appId),
          sender,
        },
        this.algorandService.algodClient,
      );

      const appAddress = (await appClient.appClient.getAppReference())
        .appAddress;

      this.logger.log(
        'Paying for Minimum Balance Requirement (MBR) for document upload...',
      );
      const mbrPayment = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: sender.addr,
        to: appAddress,
        amount: 100_000,
        suggestedParams: await this.algorandService.algodClient
          .getTransactionParams()
          .do(),
      });

      await algokit.sendTransaction(
        {
          transaction: mbrPayment,
          from: sender,
        },
        this.algorandService.algodClient,
      );

      this.logger.log('MBR paid successfully');

      const documentBuffer = Buffer.from(JSON.stringify(didDocument));
      const publicKey = algosdk.decodeAddress(didOwnerAddress).publicKey;

      const boxIndices = (await appClient.appClient.getBoxValueFromABIType(
        publicKey,
        algosdk.ABIType.from('(uint64,uint64,uint8,uint64,uint64)'),
      )) as bigint[];

      const metadata = {
        start: boxIndices[0],
        end: boxIndices[1],
        status: boxIndices[2],
        endSize: boxIndices[3],
      };

      const numOfBoxes = Math.floor(documentBuffer.byteLength / MAX_BOX_SIZE);
      const boxData: Buffer[] = [];

      for (let i = 0; i < numOfBoxes; i++) {
        const box = documentBuffer.subarray(
          i * MAX_BOX_SIZE,
          (i + 1) * MAX_BOX_SIZE,
        );
        boxData.push(box);
      }

      const lastBox = documentBuffer.subarray(
        numOfBoxes * MAX_BOX_SIZE,
        documentBuffer.byteLength,
      );
      boxData.push(lastBox);

      if (
        Buffer.concat(boxData).toString('hex') !==
        documentBuffer.toString('hex')
      ) {
        throw new Error('Box data does not match the document');
      }

      const txIds: string[] = [];

      for (
        let boxIndexOffset = 0;
        boxIndexOffset < boxData.length;
        boxIndexOffset++
      ) {
        const box = boxData[boxIndexOffset];

        const newRes = await this.uploadDidBox({
          box,
          boxIndexOffset: boxIndexOffset,
          metadata,
          appId: Number(appId),
          algoDidClient: appClient,
          sender: {
            addr: sender.addr,
            signer: algosdk.makeBasicAccountTransactionSigner(sender),
          },
          publicKey,
        });

        txIds.push(...newRes);
      }

      this.logger.log(
        `DID document uploaded successfully: ${txIds.join(', ')}`,
      );
      return { txIds };
    } catch (error) {
      this.logger.error(`Error uploading DID document: ${error}`);
      throw error;
    }
  }

  async uploadDidBox(dto: UploadDidBoxDto) {
    const {
      box,
      boxIndexOffset,
      metadata,
      appId,
      algoDidClient,
      sender,
      publicKey,
    } = dto;

    this.logger.log(`Uploading DID box: ${boxIndexOffset}...`);

    const boxIndex = BigInt(Number(metadata.start) + boxIndexOffset);
    const numOfChunks = Math.ceil(box.byteLength / BYTES_PER_CALL);

    const chunks: Buffer[] = [];

    for (let i = 0; i < numOfChunks; i += 1) {
      chunks.push(box.subarray(i * BYTES_PER_CALL, (i + 1) * BYTES_PER_CALL));
    }

    const boxRef = {
      appIndex: Number(appId),
      name: algosdk.encodeUint64(boxIndex),
    };
    const boxes: algosdk.BoxReference[] = new Array(7).fill(boxRef);
    boxes.push({ appIndex: Number(appId), name: publicKey });

    const firstGroup = chunks.slice(0, 8);
    const secondGroup = chunks.slice(8);

    const res = await this.massUploadChunks({
      chunks: firstGroup,
      boxIndex: Number(boxIndex),
      boxes,
      appId,
      algoDidClient,
      sender,
      publicKey,
      bytesOffset: 0,
    });

    if (secondGroup.length === 0) return res.txIDs;

    const res2 = await this.massUploadChunks({
      chunks: secondGroup,
      boxIndex: Number(boxIndex),
      boxes,
      appId,
      algoDidClient,
      sender,
      publicKey,
      bytesOffset: 8,
    });

    this.logger.log(`DID box ${boxIndexOffset} uploaded successfully`);

    return [...res.txIDs, ...res2.txIDs];
  }

  async massUploadChunks(dto: MassUploadChunksDto) {
    const {
      chunks,
      boxIndex,
      boxes,
      appId,
      algoDidClient,
      sender,
      publicKey,
      bytesOffset,
    } = dto;

    this.logger.log(
      `Uploading chunk number ${bytesOffset} of box number ${boxIndex}...`,
    );

    const atc = new algosdk.AtomicTransactionComposer();
    const abiMethod = algoDidClient.appClient.getABIMethod('upload');
    const suggestedParams = await this.algorandService.algodClient
      .getTransactionParams()
      .do();

    chunks.forEach((chunk, index) => {
      atc.addMethodCall({
        method: abiMethod!,
        methodArgs: [
          publicKey,
          boxIndex,
          BYTES_PER_CALL * (index + bytesOffset),
          chunk,
        ],
        boxes,
        suggestedParams,
        sender: sender.addr,
        signer: sender.signer,
        appID: Number(appId),
      });
    });

    return atc.execute(this.algorandService.algodClient, 3);
  }

  async finishDidDocumentUpload(appId: number, didOwnerAddress: string) {
    this.logger.log('Finishing DID document upload...');

    const sender = this.algorandService.loadMasterWallet();
    const appClient = new AlgoDidClient(
      {
        resolveBy: 'id',
        id: Number(appId),
        sender,
      },
      this.algorandService.algodClient,
    );

    const publicKey = algosdk.decodeAddress(didOwnerAddress).publicKey;

    const response = await appClient.finishUpload(
      {
        pubKey: didOwnerAddress,
      },
      {
        sendParams: {
          suppressLog: true,
        },
        boxes: [
          {
            appIndex: Number(appId),
            name: publicKey,
          },
        ],
      },
    );

    this.logger.log('DID document upload finished successfully');
    return response;
  }

  async createDid(didOwnerAddress: string) {
    this.logger.log(`Creating DID for address: ${didOwnerAddress}`);

    const { appId } = await this.deployDidContract();
    const didDocument = this.createDidDocument(Number(appId), didOwnerAddress);

    await this.startDidDocumentUpload(
      Number(appId),
      didOwnerAddress,
      didDocument,
    );

    await this.uploadDidDocument(Number(appId), didOwnerAddress, didDocument);

    await this.finishDidDocumentUpload(Number(appId), didOwnerAddress);

    this.logger.log(`DID created successfully for address: ${didOwnerAddress}`);

    return didDocument;
  }

  async getDidMetaData(appId: number, address: string) {
    this.logger.log(`Getting DID metadata for app id: ${appId}`);

    const sender = this.algorandService.loadMasterWallet();
    const publicKey = algosdk.decodeAddress(address).publicKey;

    const appClient = new AlgoDidClient(
      {
        resolveBy: 'id',
        id: Number(appId),
        sender,
      },
      this.algorandService.algodClient,
    );

    const boxIndices = (await appClient.appClient.getBoxValueFromABIType(
      publicKey,
      algosdk.ABIType.from('(uint64,uint64,uint8,uint64,uint64)'),
    )) as bigint[];

    const metadata: DidMetadata = {
      start: boxIndices[0],
      end: boxIndices[1],
      status: boxIndices[2],
      endSize: boxIndices[3],
    };

    this.logger.log('DID metadata retrieved successfully');
    return metadata;
  }

  async prepareForDocumentDelete(appId: number, didOwnerAddress: string) {
    this.logger.log(
      `Preparing for DID document deletion for address '${didOwnerAddress}' and app id '${appId}'`,
    );

    try {
      const sender = this.algorandService.loadMasterWallet();
      const appClient = new AlgoDidClient(
        {
          resolveBy: 'id',
          id: Number(appId),
          sender,
        },
        this.algorandService.algodClient,
      );

      const publicKey = algosdk.decodeAddress(didOwnerAddress).publicKey;

      const response = await appClient.startDelete(
        {
          pubKey: didOwnerAddress,
        },
        {
          sendParams: {
            suppressLog: true,
          },
          boxes: [
            {
              appIndex: Number(appId),
              name: publicKey,
            },
          ],
        },
      );

      this.logger.log('Preparation for DID document deletion successful');
      return response;
    } catch (error) {
      this.logger.error(`Error preparing for DID document deletion: ${error}`);
      throw error;
    }
  }

  async finishDocumentDelete(appId: number, didOwnerAddress: string) {
    this.logger.log(
      `Deleting DID document for address '${didOwnerAddress}' and app id '${appId}'`,
    );

    try {
      const sender = this.algorandService.loadMasterWallet();
      const appClient = new AlgoDidClient(
        {
          resolveBy: 'id',
          id: Number(appId),
          sender,
        },
        this.algorandService.algodClient,
      );

      const publicKey = algosdk.decodeAddress(didOwnerAddress).publicKey;

      const metadata = await this.getDidMetaData(appId, didOwnerAddress);

      const suggestedParams = await this.algorandService.algodClient
        .getTransactionParams()
        .do();
      const atomicTxnComposers: algosdk.AtomicTransactionComposer[] = [];

      const signer = algosdk.makeBasicAccountTransactionSigner(sender);

      for (
        let boxIndex = Number(metadata.start);
        boxIndex <= Number(metadata.end);
        boxIndex++
      ) {
        const atomicTxnComposer = new algosdk.AtomicTransactionComposer();
        const boxIndexRef = {
          appIndex: Number(appId),
          name: algosdk.encodeUint64(boxIndex),
        };

        atomicTxnComposer.addMethodCall({
          appID: Number(appId),
          method: appClient.appClient.getABIMethod('deleteData')!,
          methodArgs: [publicKey, BigInt(boxIndex)],
          boxes: [
            { appIndex: Number(appId), name: publicKey },
            ...Array.from({ length: 7 }).map(() => boxIndexRef),
          ],
          suggestedParams: { ...suggestedParams, fee: 2_000, flatFee: true },
          sender: sender.addr,
          signer,
        });

        Array.from({ length: 4 }).forEach(() => {
          atomicTxnComposer.addMethodCall({
            appID: Number(appId),
            method: appClient.appClient.getABIMethod('dummy')!,
            methodArgs: [],
            boxes: Array.from({ length: 8 }).map(() => boxIndexRef),
            suggestedParams,
            sender: sender.addr,
            signer,
            note: new Uint8Array(
              Buffer.from(`dummy ${Math.random() * 100000}`),
            ),
          });
        });

        atomicTxnComposers.push(atomicTxnComposer);
      }

      const txIds: string[] = [];

      for (const atomicTxnComposer of atomicTxnComposers) {
        const res = await atomicTxnComposer.execute(
          this.algorandService.algodClient,
          3,
        );
        txIds.push(...res.txIDs);
      }

      this.logger.log(`DID document deleted successfully: ${txIds.join(', ')}`);

      return { txIds };
    } catch (error) {
      this.logger.error(`Error deleting DID document: ${error}`);
      throw error;
    }
  }

  async deleteDid(did: string) {
    const { address, appId } = resolveDidIntoComponents(did);
    this.logger.log(
      `Deleting DID with app id ${appId} for address: ${address}`,
    );

    await this.prepareForDocumentDelete(Number(appId), address);

    const res = await this.finishDocumentDelete(Number(appId), address);

    this.logger.log(
      `DID deleted successfully for address '${address}' and app id '${appId}'`,
    );

    return res;
  }

  async resolveDidByAppId(appId: number, address: string) {
    this.logger.log(`Resolving DID by app id: ${appId}`);

    const sender = this.algorandService.loadMasterWallet();
    const appClient = new AlgoDidClient(
      {
        resolveBy: 'id',
        id: Number(appId),
        sender,
      },
      this.algorandService.algodClient,
    );

    const metadata = await this.getDidMetaData(appId, address);

    if (metadata.status === AlgoDIDStatus.DELETING) {
      throw new Error('DID Document is still being deleted');
    }

    if (metadata.status === AlgoDIDStatus.UPLOADING) {
      throw new Error('DID Document is still being uploaded');
    }

    const boxValues: Uint8Array[] = [];

    for (
      let boxIndex = Number(metadata.start);
      boxIndex <= Number(metadata.end);
      boxIndex++
    ) {
      const boxValue = await appClient.appClient.getBoxValue(
        algosdk.encodeUint64(BigInt(boxIndex)),
      );
      boxValues.push(boxValue);
    }

    const documentBuffer = Buffer.concat(boxValues);

    try {
      const doc = JSON.parse(documentBuffer.toString('utf-8')) as DidDocument;
      this.logger.log(`DID resolved successfully`);
      this.logger.log(doc);
      return doc;
    } catch (error) {
      throw new Error(
        `Invalid DID Document content: ${documentBuffer.toString('utf-8')} - ${error}`,
      );
    }
  }

  async resolveDid(did: string) {
    const { appId, address } = resolveDidIntoComponents(did);
    return this.resolveDidByAppId(Number(appId), address);
  }

  async resolveDidByApiCall(did: string) {
    this.logger.log(`Resolving DID by API call: ${did}`);
    const headers = {
      'Content-Type': 'application/json',
    };
    return axios
      .get(
        `https://dev.uniresolver.io/1.0/identifiers/${encodeURIComponent(did)}`,
        { headers },
      )
      .then((response) => response.data)
      .catch((error) => {
        this.logger.error(`Error resolving DID by API call: ${error}`);
        throw error;
      });
  }

  async updateDidDocument(did: string, didDocument: any) {
    this.logger.log(`Updating DID document for DID: ${did}`);

    const { address, appId } = resolveDidIntoComponents(did);

    await this.deleteDid(did);

    await this.startDidDocumentUpload(Number(appId), address, didDocument);

    await this.uploadDidDocument(Number(appId), address, didDocument);

    await this.finishDidDocumentUpload(Number(appId), address);

    this.logger.log(`DID document updated successfully for DID: ${did}`);

    return didDocument;
  }
}
