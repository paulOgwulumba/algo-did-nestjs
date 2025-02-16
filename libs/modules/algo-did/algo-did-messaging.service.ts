import { Injectable, Logger } from '@nestjs/common';
import { AlgorandService } from '../algorand/algorand.service';
import { ConfigService } from '@nestjs/config';
import { AlgoDidService } from './algo-did.service';
import {
  VerifiableCredential,
  VerifiablePresentation,
} from '../../interfaces/did.interface';

@Injectable()
export class AlgoDidMessagingService {
  private readonly logger = new Logger(AlgoDidMessagingService.name);

  constructor(
    private readonly algorandService: AlgorandService,
    private readonly configService: ConfigService,
    private readonly algoDidService: AlgoDidService,
  ) {}

  sendMessage(message: string) {
    this.logger.log(`Sending message: ${message}`);
  }

  createVerifiableCredential(
    issuerDid: string,
    subjectDid: string,
    claims: Record<string, unknown>,
  ): VerifiableCredential {
    this.logger.log(
      `Creating verifiable credential from ${issuerDid} to ${subjectDid}`,
    );

    const credential: VerifiableCredential = {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      id: `urn:uuid:${crypto.randomUUID()}`,
      type: ['VerifiableCredential'],
      issuer: issuerDid,
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: subjectDid,
        ...claims,
      },
      proof: {
        type: 'Ed25519Signature2020',
        created: new Date().toISOString(),
        proofPurpose: 'assertionMethod',
        verificationMethod: `${issuerDid}#master`,
        proofValue: '', // To be signed by issuer
      },
    };

    return credential;
  }

  verifyCredential(credential: VerifiableCredential): boolean {
    this.logger.log(`Verifying credential ${credential.id}`);

    // Verify the credential structure
    if (
      !credential['@context'].includes('https://www.w3.org/2018/credentials/v1')
    ) {
      this.logger.error('Invalid credential context');
      return false;
    }

    if (!credential.type.includes('VerifiableCredential')) {
      this.logger.error('Invalid credential type');
      return false;
    }

    // Verify the proof
    // TODO: Implement signature verification using issuer's public key

    return true;
  }

  createPresentation(
    credentials: VerifiableCredential[],
    holderDid: string,
  ): VerifiablePresentation {
    this.logger.log(`Creating presentation for ${holderDid}`);

    const presentation: VerifiablePresentation = {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      id: `urn:uuid:${crypto.randomUUID()}`,
      type: ['VerifiablePresentation'],
      verifiableCredential: credentials,
      proof: {
        type: 'Ed25519Signature2020',
        created: new Date().toISOString(),
        proofPurpose: 'authentication',
        verificationMethod: `${holderDid}#master`,
        proofValue: '', // To be signed by holder
      },
    };

    return presentation;
  }

  verifyPresentation(presentation: VerifiablePresentation): boolean {
    this.logger.log(`Verifying presentation ${presentation.id}`);

    // Verify the presentation structure
    if (
      !presentation['@context'].includes(
        'https://www.w3.org/2018/credentials/v1',
      )
    ) {
      this.logger.error('Invalid presentation context');
      return false;
    }

    if (!presentation.type.includes('VerifiablePresentation')) {
      this.logger.error('Invalid presentation type');
      return false;
    }

    // Verify each credential in the presentation
    for (const credential of presentation.verifiableCredential) {
      const isValid = this.verifyCredential(credential);
      if (!isValid) {
        this.logger.error(
          `Invalid credential ${credential.id} in presentation`,
        );
        return false;
      }
    }

    // Verify the presentation proof
    // TODO: Implement signature verification using holder's public key

    return true;
  }
}
