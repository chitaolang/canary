# Walrus Utility Functions

This module provides easy-to-use functions for uploading and reading files from Walrus using the `@mysten/walrus` SDK.

## Installation

The `@mysten/walrus` package is already installed as a dependency. If you need to install it manually:

```bash
yarn add @mysten/walrus
```

## Overview

Walrus is a decentralized storage and data availability protocol designed for large binary files (blobs). It uses content-addressable storage, meaning files are identified by a unique blob ID derived from their content.

## Features

- **Upload single files** to Walrus
- **Upload multiple files** as a quilt (collection of blobs)
- **Read files** from Walrus by blob ID
- **Read files as strings** with automatic text decoding
- **Save files to disk** after reading from Walrus

## Usage

### Basic Setup

```typescript
import { createWalrusClient, uploadFileToWalrus, readFileFromWalrus } from './utils/walrus';
import { createSuiClient } from './client/sui-client-factory';
import { KeyManager } from './key';

// Initialize clients
const network = 'testnet';
const suiClient = createSuiClient(network);
const walrusClient = createWalrusClient({
  network,
  suiClient,
});

// Load signer
const keyManager = new KeyManager();
const signer = keyManager.loadFromBech32(process.env.PRIVATE_KEY ?? '');
```

### Upload a Single File

```typescript
const result = await uploadFileToWalrus(walrusClient, suiClient, {
  filePath: '/path/to/file.txt',
  signer,
  epochs: 1, // Number of epochs to store the blob
  deletable: true,
  attributes: {
    'content-type': 'text/plain',
    'author': 'example',
  },
});

console.log('Blob ID:', result.blobId);
console.log('Blob Object ID:', result.blobObjectId);
console.log('Transaction Digest:', result.digest);
```

### Upload Multiple Files

```typescript
const result = await uploadFilesToWalrus(walrusClient, suiClient, {
  filePaths: ['/path/to/file1.txt', '/path/to/file2.txt'],
  signer,
  epochs: 1,
  deletable: true,
  attributes: {
    'upload-type': 'batch',
  },
});

result.files.forEach((file, index) => {
  console.log(`File ${index + 1}:`, file.blobId);
});
```

### Read a File

```typescript
// Read as Uint8Array
const fileData = await readFileFromWalrus(walrusClient, {
  blobId: '0x...',
});

// Read as string
const text = await readFileFromWalrusAsString(walrusClient, {
  blobId: '0x...',
});

// Read and save to disk
const savedPath = await readFileFromWalrusAndSave(walrusClient, {
  blobId: '0x...',
}, '/path/to/output.txt');
```

## API Reference

### `createWalrusClient(config: WalrusClientConfig): WalrusClient`

Creates a new WalrusClient instance.

**Parameters:**
- `config`: Configuration object with:
  - `network`: 'mainnet' | 'testnet' (or provide `packageConfig`)
  - `suiClient`: SuiClient instance (or provide `suiRpcUrl`)

**Returns:** WalrusClient instance

### `uploadFileToWalrus(client, suiClient, options): Promise<UploadFileResult>`

Uploads a single file to Walrus.

**Parameters:**
- `client`: WalrusClient instance
- `suiClient`: SuiClient instance for executing transactions
- `options`: UploadFileOptions
  - `filePath`: Path to the file to upload
  - `signer`: Signer for the transaction
  - `epochs?`: Number of epochs to store (default: 1)
  - `owner?`: Owner address (defaults to signer address)
  - `attributes?`: Metadata to attach to the blob
  - `deletable?`: Whether the blob is deletable (default: true)
  - `signal?`: AbortSignal for cancellation

**Returns:** Promise resolving to:
- `blobId`: Content-addressable blob identifier
- `blobObjectId`: Sui object ID of the Blob NFT
- `digest`: Transaction digest

### `uploadFilesToWalrus(client, suiClient, options): Promise<UploadFilesResult>`

Uploads multiple files to Walrus as a quilt.

**Parameters:**
- `client`: WalrusClient instance
- `suiClient`: SuiClient instance for executing transactions
- `options`: UploadFilesOptions
  - `filePaths`: Array of file paths to upload
  - `signer`: Signer for the transaction
  - `epochs?`: Number of epochs to store (default: 1)
  - `owner?`: Owner address (defaults to signer address)
  - `attributes?`: Metadata to attach to the blobs
  - `deletable?`: Whether the blobs are deletable (default: true)
  - `signal?`: AbortSignal for cancellation

**Returns:** Promise resolving to:
- `files`: Array of file information (id, blobId, blobObjectId)
- `digest`: Transaction digest

### `readFileFromWalrus(client, options): Promise<Uint8Array>`

Reads a file from Walrus by blob ID.

**Parameters:**
- `client`: WalrusClient instance
- `options`: ReadFileOptions
  - `blobId`: The blob ID to read
  - `signal?`: AbortSignal for cancellation

**Returns:** Promise resolving to file contents as Uint8Array

### `readFileFromWalrusAsString(client, options, encoding?): Promise<string>`

Reads a file from Walrus and returns it as a string.

**Parameters:**
- `client`: WalrusClient instance
- `options`: ReadFileOptions
- `encoding?`: Text encoding (default: 'utf-8')

**Returns:** Promise resolving to file contents as string

### `readFileFromWalrusAndSave(client, options, outputPath): Promise<string>`

Reads a file from Walrus and saves it to disk.

**Parameters:**
- `client`: WalrusClient instance
- `options`: ReadFileOptions
- `outputPath`: Path where the file should be saved

**Returns:** Promise resolving to the output path

## How It Works

The upload process follows these steps:

1. **Encode**: The file is encoded using erasure coding for redundancy
2. **Register**: A transaction is created to register the blob on-chain
3. **Execute**: The registration transaction is executed
4. **Upload**: The encoded blob is uploaded to storage nodes
5. **Certify**: The blob is certified by the storage nodes

The read process:

1. **Retrieve**: The blob is retrieved from storage nodes using the blob ID
2. **Decode**: The blob is decoded from erasure-coded format
3. **Return**: The original file content is returned

## Examples

See `walrus-example.ts` for complete working examples:

- `exampleUploadFile()`: Upload a single file
- `exampleUploadFiles()`: Upload multiple files
- `exampleReadFile()`: Read a file by blob ID
- `exampleReadFileAsString()`: Read a file as a string
- `exampleReadFileAndSave()`: Read and save a file to disk
- `exampleUploadAndRead()`: Complete upload and read workflow

## Error Handling

All functions throw errors if operations fail. Common errors include:

- File not found (upload)
- Blob not found (read)
- Transaction execution failures
- Network errors

Always wrap calls in try-catch blocks:

```typescript
try {
  const result = await uploadFileToWalrus(walrusClient, suiClient, options);
  console.log('Success:', result);
} catch (error) {
  console.error('Error:', error);
}
```

## Notes

- Blob IDs are content-addressable: uploading the same file twice will result in the same blob ID
- Each blob creates a corresponding Blob NFT object on Sui
- Storage costs depend on file size and number of epochs
- Files can be made non-deletable for permanent storage
- Attributes/metadata can be attached to blobs for indexing and search

## Resources

- [Walrus Documentation](https://docs.wal.app/)
- [@mysten/walrus SDK](https://sdk.mystenlabs.com/walrus)
- [Sui Documentation](https://docs.sui.io/)

