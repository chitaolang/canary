/**
 * Package Storage Transactions
 * 
 * This module provides transaction building methods for canary blob operations.
 */

import { TransactionBlockBuilder } from './transaction-builder';
import { MODULES, PKG_STORAGE_FUNCTIONS } from '../utils/constants';
import { getClockObject } from '../utils/helpers';

/**
 * PackageStorageTransactionBuilder - Builder for package storage transactions
 * 
 * Extends TransactionBlockBuilder with methods specific to canary blob operations.
 */
export class PackageStorageTransactionBuilder extends TransactionBlockBuilder {
  /**
   * Builds a transaction to store a canary blob (admin only)
   * 
   * @param registryId - Registry object ID
   * @param adminCapId - Admin capability object ID
   * @param domain - Domain name
   * @param contractBlobId - Contract blob object ID (address)
   * @param explainBlobId - Explanation blob object ID (address)
   * @param packageId - Package ID for the canary
   * @param clockId - Clock object ID (optional, will be fetched if not provided)
   * @returns This builder instance for method chaining
   * 
   * @example
   * ```typescript
   * const builder = new PackageStorageTransactionBuilder(client, packageId);
   * await builder.storeBlob(
   *   registryId,
   *   adminCapId,
   *   'example.com',
   *   contractBlobId,
   *   explainBlobId,
   *   packageId
   * );
   * ```
   */
  async storeBlob(
    registryId: string,
    adminCapId: string,
    domain: string,
    contractBlobId: string,
    explainBlobId: string,
    packageId: string,
    clockId?: string
  ): Promise<this> {
    // Get Clock object ID if not provided
    const clock = clockId || (await getClockObject(this.client));

    this.tx.moveCall({
      package: this.packageId,
      module: MODULES.PKG_STORAGE,
      function: PKG_STORAGE_FUNCTIONS.STORE_BLOB,
      arguments: [
        this.tx.object(registryId), // registry: &mut Registry
        this.tx.object(adminCapId), // admin_cap: &AdminCap
        this.tx.pure.string(domain), // domain: String
        this.tx.pure.address(contractBlobId), // contract_blob_id: address
        this.tx.pure.address(explainBlobId), // explain_blob_id: address
        this.tx.pure.address(packageId), // package_id: address
        this.tx.object(clock), // clock: &Clock
      ],
    });

    return this;
  }

  /**
   * Builds a transaction to update a canary blob (admin only)
   * 
   * @param registryId - Registry object ID
   * @param adminCapId - Admin capability object ID
   * @param canaryBlobId - Canary blob object ID
   * @param newContractBlobId - New contract blob object ID (address)
   * @param newExplainBlobId - New explanation blob object ID (address)
   * @param clockId - Clock object ID (optional, will be fetched if not provided)
   * @returns This builder instance for method chaining
   * 
   * @example
   * ```typescript
   * await builder.updateBlob(
   *   registryId,
   *   adminCapId,
   *   canaryBlobId,
   *   newContractBlobId,
   *   newExplainBlobId
   * );
   * ```
   */
  async updateBlob(
    registryId: string,
    adminCapId: string,
    canaryBlobId: string,
    newContractBlobId: string,
    newExplainBlobId: string,
    clockId?: string
  ): Promise<this> {
    // Get Clock object ID if not provided
    const clock = clockId || (await getClockObject(this.client));

    this.tx.moveCall({
      package: this.packageId,
      module: MODULES.PKG_STORAGE,
      function: PKG_STORAGE_FUNCTIONS.UPDATE_BLOB,
      arguments: [
        this.tx.object(registryId), // registry: &Registry
        this.tx.object(adminCapId), // admin_cap: &AdminCap
        this.tx.object(canaryBlobId), // canary_blob: &mut CanaryBlob
        this.tx.pure.address(newContractBlobId), // new_contract_blob_id: address
        this.tx.pure.address(newExplainBlobId), // new_explain_blob_id: address
        this.tx.object(clock), // clock: &Clock
      ],
    });

    return this;
  }

  /**
   * Builds a transaction to delete a canary blob (admin only)
   * 
   * @param registryId - Registry object ID
   * @param adminCapId - Admin capability object ID
   * @param canaryBlobId - Canary blob object ID
   * @returns This builder instance for method chaining
   * 
   * @example
   * ```typescript
   * builder.deleteCanaryBlob(registryId, adminCapId, canaryBlobId);
   * ```
   */
  deleteCanaryBlob(registryId: string, adminCapId: string, canaryBlobId: string): this {
    this.tx.moveCall({
      package: this.packageId,
      module: MODULES.PKG_STORAGE,
      function: PKG_STORAGE_FUNCTIONS.DELETE_CANARY_BLOB,
      arguments: [
        this.tx.object(registryId), // registry: &Registry
        this.tx.object(adminCapId), // admin_cap: &AdminCap
        this.tx.object(canaryBlobId), // canary_blob: CanaryBlob
      ],
    });

    return this;
  }
}

