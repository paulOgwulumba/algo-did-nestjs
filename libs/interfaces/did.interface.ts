export interface DidDocument {
  '@context': string[];
  id: string;
  controller?: string | string[];
  verificationMethod: VerificationMethod[];
  service?: ServiceProperty[];
}

export interface VerificationMethod {
  id: string;
  type: string;
  controller: string;
  publicKeyMultibase?: string;
  publicKeyJwk?: string;
}

export interface ServiceProperty {
  id: string;
  type: string;
  serviceEndpoint: string;
}

export interface DidMetadata {
  start: bigint;
  end: bigint;
  status: bigint;
  endSize: bigint;
}

/**
 * @see https://www.w3.org/TR/vc-data-model/#concrete-lifecycle-example
 */
export interface VerifiableCredential {
  /**
   * Example: ['https://www.w3.org/2018/credentials/v1']
   * @see https://www.w3.org/TR/vc-data-model/#concrete-lifecycle-example
   */
  '@context': string[];

  /**
   * The identifier of the Verifiable Credential.
   * Example: 'https://example.com/credentials/3732'
   */
  id: string;

  /**
   * The type of the Verifiable Credential.
   * Example: ['VerifiableCredential', 'InternationalPassportCredential']
   */
  type: string[];

  /**
   * The entity that issued the Verifiable Credential.
   * Example: 'did:example:123'
   */
  issuer: string;

  /**
   * The date of issuance of the Verifiable Credential.
   * Example: '2021-01-01T00:00:00Z'
   */
  issuanceDate: string;

  /**
   * The expiration date of the Verifiable Credential.
   * Example: '2021-01-01T00:00:00Z'
   */
  expirationDate?: string;

  /**
   * The date from which the Verifiable Credential is valid.
   * Example: '2021-01-01T00:00:00Z'
   */
  validFrom?: string;

  /**
   * The date until which the Verifiable Credential is valid.
   * Example: '2021-01-01T00:00:00Z'
   */
  validUntil?: string;

  /**
   * The subject of the Verifiable Credential.
   * Example: { name: 'John Doe', email: 'john.doe@example.com' }
   */
  credentialSubject: {
    /**
     * The identifier of the subject.
     * Example: 'did:example:123'
     */
    id: string;

    /**
     * The properties of the subject.
     * Example: { name: 'John Doe', email: 'john.doe@example.com' }
     */
    [key: string]: unknown;
  };

  /**
   * The proof of the Verifiable Credential.
   * Example: { type: 'Ed25519Signature2020', created: '2021-01-01T00:00:00Z', proofPurpose: 'assertionMethod', verificationMethod: 'did:example:123#key', signature: '...' }
   */
  proof: VerifiableCredentialProof;
}

export interface VerifiablePresentation {
  '@context': string[];
  id: string;
  type: string[];
  verifiableCredential: VerifiableCredential[];
  proof: VerifiableCredentialProof;
}

/**
 * @see https://www.w3.org/TR/vc-data-model/#proofs-signatures
 */
export interface VerifiableCredentialProof {
  type: string;
  created: string;
  proofPurpose: string;
  verificationMethod: string;
  proofValue?: string;
  signature?: string;
  jws?: string;
}
