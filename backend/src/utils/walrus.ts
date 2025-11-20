/**
 * Walrus Utility Functions
 * 
 * This module provides easy-to-use functions for uploading and reading files from Walrus
 * using the @mysten/walrus SDK.
 */

import { WalrusClient, WalrusFile, type WalrusClientConfig, type WriteBlobFlow, type WriteFilesFlow } from '@mysten/walrus';
import type { Signer } from '@mysten/sui/cryptography';
import type { SuiClient } from '@mysten/sui/client';
import { readFile } from 'fs/promises';

/**
 * Options for uploading a file to Walrus
 */
export interface UploadFileOptions {
  /** Path to the file to upload */
  filePath: string;
  /** Signer for the transaction */
  signer: Signer;
  /** Number of epochs to store the blob (default: 1) */
  epochs?: number;
  /** Owner address (defaults to signer address) */
  owner?: string;
  /** Attributes/metadata to attach to the blob */
  attributes?: Record<string, string | null>;
  /** Whether the blob is deletable (default: true) */
  deletable?: boolean;
  /** Request signal for cancellation */
  signal?: AbortSignal;
}

/**
 * Options for uploading multiple files to Walrus
 */
export interface UploadFilesOptions {
  /** Array of file paths to upload */
  filePaths: string[];
  /** Signer for the transaction */
  signer: Signer;
  /** Number of epochs to store the blobs (default: 1) */
  epochs?: number;
  /** Owner address (defaults to signer address) */
  owner?: string;
  /** Attributes/metadata to attach to the blobs */
  attributes?: Record<string, string | null>;
  /** Whether the blobs are deletable (default: true) */
  deletable?: boolean;
  /** Request signal for cancellation */
  signal?: AbortSignal;
}

/**
 * Result of uploading a file to Walrus
 */
export interface UploadFileResult {
  /** The blob ID (content-addressable identifier) */
  blobId: string;
  /** The Sui object ID of the Blob NFT */
  blobObjectId: string;
  /** Transaction digest */
  digest: string;
}

/**
 * Result of uploading multiple files to Walrus
 */
export interface UploadFilesResult {
  /** Array of upload results, one per file */
  files: Array<{
    /** File identifier */
    id: string;
    /** The blob ID */
    blobId: string;
    /** The Sui object ID of the Blob NFT */
    blobObjectId: string;
  }>;
  /** Transaction digest */
  digest: string;
}

/**
 * Options for reading a file from Walrus
 */
export interface ReadFileOptions {
  /** The blob ID to read */
  blobId: string;
  /** Request signal for cancellation */
  signal?: AbortSignal;
}

/**
 * Creates a WalrusClient instance
 * 
 * @param config - Configuration for the Walrus client
 * @returns WalrusClient instance
 * 
 * @example
 * ```typescript
 * const client = createWalrusClient({
 *   network: 'testnet',
 *   suiClient: suiClient,
 * });
 * ```
 */
export function createWalrusClient(config: WalrusClientConfig): WalrusClient {
  return new WalrusClient(config);
}

/**
 * Uploads a single file to Walrus
 * 
 * This function handles the complete flow:
 * 1. Reads the file from disk
 * 2. Encodes the blob
 * 3. Creates and executes the registration transaction
 * 4. Uploads the blob to storage nodes
 * 5. Certifies the blob
 * 
 * @param client - WalrusClient instance
 * @param suiClient - SuiClient instance for executing transactions
 * @param options - Upload options
 * @returns Promise resolving to upload result with blobId and blobObjectId
 * 
 * @example
 * ```typescript
 * const suiClient = createSuiClient('testnet');
 * const walrusClient = createWalrusClient({
 *   network: 'testnet',
 *   suiClient: suiClient,
 * });
 * 
 * const result = await uploadFileToWalrus(walrusClient, suiClient, {
 *   filePath: '/path/to/file.txt',
 *   signer: keypair,
 *   epochs: 3,
 *   deletable: true,
 * });
 * 
 * console.log('Blob ID:', result.blobId);
 * console.log('Blob Object ID:', result.blobObjectId);
 * ```
 */
export async function uploadFileToWalrus(
  client: WalrusClient,
  suiClient: SuiClient,
  options: UploadFileOptions
): Promise<UploadFileResult> {
  const {
    filePath,
    signer,
    epochs = 1,
    owner,
    attributes,
    deletable = true,
    signal,
  } = options;

  // Read file from disk
  const fileBytes = await readFile(filePath);

  // Use writeBlobFlow for single file upload
  const flow = client.writeBlobFlow({
    blob: fileBytes,
  });

  // Step 1: Encode the blob
  await flow.encode();

  // Step 2: Register the blob (create transaction)
  const ownerAddress = owner || signer.toSuiAddress();
  const registerTx = flow.register({
    deletable,
    epochs,
    owner: ownerAddress,
    attributes,
  });

  // Step 3: Execute the registration transaction
  const result = await suiClient.signAndExecuteTransaction({
    signer,
    transaction: registerTx,
    options: {
      showEffects: true,
    },
  });

  if (!result.effects?.transactionDigest) {
    throw new Error('Failed to execute registration transaction');
  }

  const digest = result.effects.transactionDigest;

  // Step 4: Upload the blob to storage nodes
  await flow.upload({ digest });

  // Step 5: Certify the blob
  const certifyTx = flow.certify();
  await suiClient.signAndExecuteTransaction({
    signer,
    transaction: certifyTx,
  });

  // Get the blob information
  const blobInfo = await flow.getBlob();

  return {
    blobId: blobInfo.blobId,
    blobObjectId: blobInfo.blobObject.id.id,
    digest,
  };
}

/**
 * Uploads multiple files to Walrus as a quilt (collection of blobs)
 * 
 * This function handles the complete flow for multiple files:
 * 1. Reads all files from disk
 * 2. Encodes the blobs
 * 3. Creates and executes the registration transaction
 * 4. Uploads the blobs to storage nodes
 * 5. Certifies the blobs
 * 
 * @param client - WalrusClient instance
 * @param suiClient - SuiClient instance for executing transactions
 * @param options - Upload options
 * @returns Promise resolving to upload results with blobIds and blobObjectIds
 * 
 * @example
 * ```typescript
 * const suiClient = createSuiClient('testnet');
 * const walrusClient = createWalrusClient({
 *   network: 'testnet',
 *   suiClient: suiClient,
 * });
 * 
 * const result = await uploadFilesToWalrus(walrusClient, suiClient, {
 *   filePaths: ['/path/to/file1.txt', '/path/to/file2.txt'],
 *   signer: keypair,
 *   epochs: 3,
 *   deletable: true,
 * });
 * 
 * result.files.forEach((file, index) => {
 *   console.log(`File ${index + 1}:`, file.blobId);
 * });
 * ```
 */
export async function uploadFilesToWalrus(
  client: WalrusClient,
  suiClient: SuiClient,
  options: UploadFilesOptions
): Promise<UploadFilesResult> {
  const {
    filePaths,
    signer,
    epochs = 1,
    owner,
    attributes,
    deletable = true,
    signal,
  } = options;

  // Read all files from disk
  const walrusFiles = await Promise.all(
    filePaths.map(async (filePath) => {
      const fileBytes = await readFile(filePath);
      const fileName = filePath.split('/').pop() || 'file';
      return WalrusFile.from({
        contents: fileBytes,
        identifier: fileName,
      });
    })
  );

  // Use writeFilesFlow for multiple file upload
  const flow = client.writeFilesFlow({
    files: walrusFiles,
  });

  // Step 1: Encode the blobs
  await flow.encode();

  // Step 2: Register the blobs (create transaction)
  const ownerAddress = owner || signer.toSuiAddress();
  const registerTx = flow.register({
    deletable,
    epochs,
    owner: ownerAddress,
    attributes,
  });

  // Step 3: Execute the registration transaction
  const result = await suiClient.signAndExecuteTransaction({
    signer,
    transaction: registerTx,
    options: {
      showEffects: true,
    },
  });

  if (!result.effects?.transactionDigest) {
    throw new Error('Failed to execute registration transaction');
  }

  const digest = result.effects.transactionDigest;

  // Step 4: Upload the blobs to storage nodes
  await flow.upload({ digest });

  // Step 5: Certify the blobs
  const certifyTx = flow.certify();
  await suiClient.signAndExecuteTransaction({
    signer,
    transaction: certifyTx,
  });

  // Get the file information
  const files = await flow.listFiles();

  return {
    files: files.map((file) => ({
      id: file.id,
      blobId: file.blobId,
      blobObjectId: file.blobObject.id.id,
    })),
    digest,
  };
}

/**
 * Reads a file from Walrus by blob ID
 * 
 * @param client - WalrusClient instance
 * @param options - Read options
 * @returns Promise resolving to the file contents as Uint8Array
 * 
 * @example
 * ```typescript
 * const walrusClient = createWalrusClient({
 *   network: 'testnet',
 *   suiClient: suiClient,
 * });
 * 
 * const fileData = await readFileFromWalrus(walrusClient, {
 *   blobId: '0x...',
 * });
 * 
 * // Convert to string if it's a text file
 * const text = new TextDecoder().decode(fileData);
 * console.log(text);
 * ```
 */
export async function readFileFromWalrus(
  client: WalrusClient,
  options: ReadFileOptions
): Promise<Uint8Array> {
  const { blobId, signal } = options;

  try {
    const blobData = await client.readBlob({ blobId, signal });
    return blobData;
  } catch (error) {
    throw new Error(
      `Failed to read blob ${blobId}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Reads a file from Walrus and returns it as a string
 * 
 * @param client - WalrusClient instance
 * @param options - Read options
 * @param encoding - Text encoding (default: 'utf-8')
 * @returns Promise resolving to the file contents as a string
 * 
 * @example
 * ```typescript
 * const text = await readFileFromWalrusAsString(walrusClient, {
 *   blobId: '0x...',
 * });
 * console.log(text);
 * ```
 */
export async function readFileFromWalrusAsString(
  client: WalrusClient,
  options: ReadFileOptions,
  encoding: BufferEncoding = 'utf-8'
): Promise<string> {
  const blobData = await readFileFromWalrus(client, options);
  const decoder = new TextDecoder(encoding);
  return decoder.decode(blobData);
}

/**
 * Reads a file from Walrus and saves it to disk
 * 
 * @param client - WalrusClient instance
 * @param options - Read options
 * @param outputPath - Path where the file should be saved
 * @returns Promise resolving to the output path
 * 
 * @example
 * ```typescript
 * await readFileFromWalrusAndSave(walrusClient, {
 *   blobId: '0x...',
 * }, '/path/to/output.txt');
 * ```
 */
export async function readFileFromWalrusAndSave(
  client: WalrusClient,
  options: ReadFileOptions,
  outputPath: string
): Promise<string> {
  const blobData = await readFileFromWalrus(client, options);
  const { writeFile } = await import('fs/promises');
  await writeFile(outputPath, blobData);
  return outputPath;
}

