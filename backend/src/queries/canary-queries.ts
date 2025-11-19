/**
 * Canary Queries
 * 
 * This module provides read-only query functions for canary blobs.
 */

import type { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';
import type { CanaryBlob, CanaryBlobFullInfo } from '../types/contract-types';
import { MODULES } from '../utils/constants';

/**
 * Derives the canary address from registry, domain, module name, and package ID
 * 
 * @param client - Sui client instance
 * @param packageId - Package ID of the deployed contract
 * @param registryId - Registry object ID
 * @param domain - Domain name
 * @param moduleName - Module name
 * @param canaryPackageId - Package ID for the canary
 * @returns Derived canary address
 * 
 * @example
 * ```typescript
 * const address = await deriveCanaryAddress(client, packageId, registryId, 'example.com', 'core', '0x...');
 * ```
 */
export async function deriveCanaryAddress(
  client: SuiClient,
  packageId: string,
  registryId: string,
  domain: string,
  moduleName: string,
  canaryPackageId: string,
): Promise<string> {
  try {
    const tx = new Transaction();
    tx.moveCall({
      package: packageId,
      module: MODULES.PKG_STORAGE,
      function: 'derive_canary_address',
      arguments: [
        tx.object(registryId),
        tx.pure.string(domain),
        tx.pure.string(moduleName),
        tx.pure.address(canaryPackageId),
      ],
    });

    const result = await client.devInspectTransactionBlock({
      sender: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // Use zero address for view functions
      transactionBlock: tx,
    });

    if (result.results && result.results[0]?.returnValues) {
      const returnValue = result.results[0].returnValues[0];
      if (returnValue) {
        // Decode address from BCS
        return bcs.Address.parse(Uint8Array.from(returnValue[0])) as string;
      }
    }

    throw new Error('Failed to derive canary address');
  } catch (error) {
    console.error('Error deriving canary address:', error);
    throw error;
  }
}

/**
 * Checks if a canary blob exists for the given domain, module name, and package ID
 * 
 * @param client - Sui client instance
 * @param packageId - Package ID of the deployed contract
 * @param registryId - Registry object ID
 * @param domain - Domain name
 * @param moduleName - Module name
 * @param canaryPackageId - Package ID for the canary
 * @returns true if canary exists, false otherwise
 * 
 * @example
 * ```typescript
 * const exists = await canaryExists(client, packageId, registryId, 'example.com', 'core', '0x...');
 * ```
 */
export async function canaryExists(
  client: SuiClient,
  packageId: string,
  registryId: string,
  domain: string,
  moduleName: string,
  canaryPackageId: string
): Promise<boolean> {
  try {
    const tx = new Transaction();
    tx.moveCall({
      package: packageId,
      module: MODULES.PKG_STORAGE,
      function: 'canary_exists',
      arguments: [
        tx.object(registryId),
        tx.pure.string(domain),
        tx.pure.string(moduleName),
        tx.pure.address(canaryPackageId),
      ],
    });

    const result = await client.devInspectTransactionBlock({
      sender: '0x0',
      transactionBlock: await tx.build({ client }),
    });

    if (result.results && result.results[0]?.returnValues) {
      const returnValue = result.results[0].returnValues[0];
      if (returnValue) {
        // Decode boolean from BCS
        return bcs.Bool.parse(Uint8Array.from(returnValue[0])) as boolean;
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking if canary exists:', error);
    return false;
  }
}

/**
 * Gets canary blob information by object ID
 * 
 * @param client - Sui client instance
 * @param canaryBlobId - Canary blob object ID
 * @returns Canary blob information, or null if not found
 * 
 * @example
 * ```typescript
 * const blob = await getCanaryBlob(client, canaryBlobId);
 * ```
 */
export async function getCanaryBlob(
  client: SuiClient,
  canaryBlobId: string
): Promise<CanaryBlob | null> {
  try {
    const object = await client.getObject({
      id: canaryBlobId,
      options: {
        showContent: true,
        showType: true,
      },
    });

    if (object.data?.content && 'fields' in object.data.content) {
      const fields = object.data.content.fields as any;

      return {
        id: canaryBlobId,
        contractBlobId: fields.contract_blob_id || '',
        explainBlobId: fields.explain_blob_id || '',
        packageId: fields.package_id || '',
        domain: fields.domain || '',
        uploadedAt: Number(fields.uploaded_at || 0),
        uploadedByAdmin: fields.uploaded_by_admin || '',
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting canary blob:', error);
    return null;
  }
}

/**
 * Gets blob IDs (contract and explain) from a canary blob
 * 
 * @param client - Sui client instance
 * @param packageId - Package ID of the deployed contract
 * @param canaryBlobId - Canary blob object ID
 * @returns Object with contractBlobId and explainBlobId
 * 
 * @example
 * ```typescript
 * const { contractBlobId, explainBlobId } = await getBlobIds(client, packageId, canaryBlobId);
 * ```
 */
export async function getBlobIds(
  client: SuiClient,
  packageId: string,
  canaryBlobId: string
): Promise<{ contractBlobId: string; explainBlobId: string }> {
  try {
    // Read directly from object state (faster)
    const blob = await getCanaryBlob(client, canaryBlobId);
    if (blob) {
      return {
        contractBlobId: blob.contractBlobId,
        explainBlobId: blob.explainBlobId,
      };
    }

    // Fallback: use devInspectTransactionBlock
    const tx = new Transaction();
    tx.moveCall({
      package: packageId,
      module: MODULES.PKG_STORAGE,
      function: 'get_blob_id',
      arguments: [
        tx.object(canaryBlobId),
      ],
    });

    const result = await client.devInspectTransactionBlock({
      sender: '0x0',
      transactionBlock: await tx.build({ client }),
    });

    if (result.results && result.results[0]?.returnValues) {
      const returnValue = result.results[0].returnValues[0];
      if (returnValue) {
        // Decode tuple (address, address) from BCS
        const data = Uint8Array.from(returnValue[0]);
        // This requires proper tuple decoding
        // For now, return from object state
      }
    }

    throw new Error('Failed to get blob IDs');
  } catch (error) {
    console.error('Error getting blob IDs:', error);
    throw error;
  }
}

/**
 * Gets full information about a canary blob
 * 
 * @param client - Sui client instance
 * @param packageId - Package ID of the deployed contract
 * @param canaryBlobId - Canary blob object ID
 * @returns Full canary blob information
 * 
 * @example
 * ```typescript
 * const fullInfo = await getFullInfo(client, packageId, canaryBlobId);
 * ```
 */
export async function getFullInfo(
  client: SuiClient,
  packageId: string,
  canaryBlobId: string
): Promise<CanaryBlobFullInfo> {
  try {
    // Read directly from object state (faster and more reliable)
    const blob = await getCanaryBlob(client, canaryBlobId);
    if (blob) {
      return {
        contractBlobId: blob.contractBlobId,
        explainBlobId: blob.explainBlobId,
        packageId: blob.packageId,
        domain: blob.domain,
        uploadedAt: blob.uploadedAt,
        uploadedByAdmin: blob.uploadedByAdmin,
      };
    }

    // Fallback: use devInspectTransactionBlock
    const tx = new Transaction();
    tx.moveCall({
      package: packageId,
      module: MODULES.PKG_STORAGE,
      function: 'get_full_info',
      arguments: [
        tx.object(canaryBlobId),
      ],
    });

    const result = await client.devInspectTransactionBlock({
      sender: '0x0',
      transactionBlock: await tx.build({ client }),
    });

    if (result.results && result.results[0]?.returnValues) {
      const returnValue = result.results[0].returnValues[0];
      if (returnValue) {
        // Decode tuple from BCS
        // Tuple: (address, address, address, String, u64, address)
        // This requires proper tuple decoding
        // For now, return from object state
      }
    }

    throw new Error('Failed to get full info');
  } catch (error) {
    console.error('Error getting full info:', error);
    throw error;
  }
}

