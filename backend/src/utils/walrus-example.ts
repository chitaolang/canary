/**
 * Walrus Utility Example
 * 
 * This file demonstrates how to use the Walrus utility functions
 * to upload and read files from Walrus.
 */

import {
    createWalrusClient,
    uploadFileToWalrus,
    uploadFilesToWalrus,
    readFileFromWalrus,
    readFileFromWalrusAsString,
    readFileFromWalrusAndSave,
} from './walrus';
import { createSuiClient } from '../client/sui-client-factory';
import { KeyManager } from '../key';
import { writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * Example: Upload a single file to Walrus
 */
export async function exampleUploadFile() {
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

    // Create a test file
    const testFilePath = join(tmpdir(), 'test-file.txt');
    await writeFile(testFilePath, 'Hello, Walrus! This is a test file.');

    try {
        // Upload the file
        const result = await uploadFileToWalrus(walrusClient, suiClient, {
            filePath: testFilePath,
            signer,
            epochs: 1, // Store for 1 epoch
            deletable: true,
            attributes: {
                'content-type': 'text/plain',
                'author': 'example',
            },
        });

        console.log('File uploaded successfully!');
        console.log('Blob ID:', result.blobId);
        console.log('Blob Object ID:', result.blobObjectId);
        console.log('Transaction Digest:', result.digest);

        return result;
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
}

/**
 * Example: Upload multiple files to Walrus
 */
export async function exampleUploadFiles() {
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

    // Create test files
    const testFile1 = join(tmpdir(), 'test-file-1.txt');
    const testFile2 = join(tmpdir(), 'test-file-2.txt');
    await writeFile(testFile1, 'This is the first test file.');
    await writeFile(testFile2, 'This is the second test file.');

    try {
        // Upload multiple files
        const result = await uploadFilesToWalrus(walrusClient, suiClient, {
            filePaths: [testFile1, testFile2],
            signer,
            epochs: 1,
            deletable: true,
            attributes: {
                'upload-type': 'batch',
            },
        });

        console.log('Files uploaded successfully!');
        console.log('Transaction Digest:', result.digest);
        result.files.forEach((file, index) => {
            console.log(`File ${index + 1}:`);
            console.log('  ID:', file.id);
            console.log('  Blob ID:', file.blobId);
            console.log('  Blob Object ID:', file.blobObjectId);
        });

        return result;
    } catch (error) {
        console.error('Error uploading files:', error);
        throw error;
    }
}

/**
 * Example: Read a file from Walrus
 */
export async function exampleReadFile(blobId: string) {
    // Initialize clients
    const network = 'testnet';
    const suiClient = createSuiClient(network);
    const walrusClient = createWalrusClient({
        network,
        suiClient,
    });

    try {
        // Read the file as Uint8Array
        const fileData = await readFileFromWalrus(walrusClient, {
            blobId,
        });

        // Convert to string
        const text = new TextDecoder().decode(fileData);
        console.log('File content:', text);

        return fileData;
    } catch (error) {
        console.error('Error reading file:', error);
        throw error;
    }
}

/**
 * Example: Read a file from Walrus as a string
 */
export async function exampleReadFileAsString(blobId: string) {
    // Initialize clients
    const network = 'testnet';
    const suiClient = createSuiClient(network);
    const walrusClient = createWalrusClient({
        network,
        suiClient,
    });

    try {
        // Read the file directly as a string
        const text = await readFileFromWalrusAsString(walrusClient, {
            blobId,
        });

        console.log('File content:', text);
        return text;
    } catch (error) {
        console.error('Error reading file:', error);
        throw error;
    }
}

/**
 * Example: Read a file from Walrus and save it to disk
 */
export async function exampleReadFileAndSave(blobId: string, outputPath?: string) {
    // Initialize clients
    const network = 'testnet';
    const suiClient = createSuiClient(network);
    const walrusClient = createWalrusClient({
        network,
        suiClient,
    });

    // Use provided output path or create a temp file
    const output = outputPath || join(tmpdir(), `downloaded-${blobId.slice(0, 8)}.txt`);

    try {
        // Read and save the file
        const savedPath = await readFileFromWalrusAndSave(walrusClient, {
            blobId,
        }, output);

        console.log('File saved to:', savedPath);
        return savedPath;
    } catch (error) {
        console.error('Error reading and saving file:', error);
        throw error;
    }
}

/**
 * Complete example: Upload a file, then read it back
 */
export async function exampleUploadAndRead() {
    try {
        // Step 1: Upload a file
        console.log('Step 1: Uploading file...');
        const uploadResult = await exampleUploadFile();

        // Step 2: Read the file back
        console.log('\nStep 2: Reading file back...');
        await exampleReadFileAsString(uploadResult.blobId);

        // Step 3: Save the file to disk
        console.log('\nStep 3: Saving file to disk...');
        const savedPath = await exampleReadFileAndSave(uploadResult.blobId);
        console.log('File saved to:', savedPath);

        return {
            uploadResult,
            savedPath,
        };
    } catch (error) {
        console.error('Error in upload and read example:', error);
        throw error;
    }
}

// Run example if this file is executed directly
if (require.main === module) {
    // Uncomment to run a specific example:
    // exampleUploadFile().catch(console.error);
    // exampleUploadFiles().catch(console.error);
    // exampleReadFile('0x...').catch(console.error);
    // exampleUploadAndRead().catch(console.error);
}

