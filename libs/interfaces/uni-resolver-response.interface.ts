import { DidDocument } from './did.interface';

export interface UniResolverResponse {
  didDocument: DidDocument;
  didResolutionMetadata: {
    contentType: string;
    duration: number;
    // Add other expected fields if needed
  };
}
