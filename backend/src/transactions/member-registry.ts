/**
 * Member Registry Transactions
 * 
 * This module provides transaction building methods for member registry operations.
 */

import { TransactionBlockBuilder } from './transaction-builder';
import { MODULES, MEMBER_REGISTRY_FUNCTIONS } from '../utils/constants';
import { getClockObject } from '../utils/helpers';

/**
 * MemberRegistryTransactionBuilder - Builder for member registry transactions
 * 
 * Extends TransactionBlockBuilder with methods specific to member registry operations.
 */
export class MemberRegistryTransactionBuilder extends TransactionBlockBuilder {
  /**
   * Builds a transaction to join the registry
   * 
   * @param registryId - Registry object ID
   * @param domain - Domain name for the member
   * @param paymentCoin - Coin object ID to use for payment
   * @param clockId - Clock object ID (optional, will be fetched if not provided)
   * @returns This builder instance for method chaining
   * 
   * @example
   * ```typescript
   * const builder = new MemberRegistryTransactionBuilder(client, packageId);
   * await builder.joinRegistry(registryId, 'example.com', paymentCoinId);
   * ```
   */
  async joinRegistry(
    registryId: string,
    domain: string,
    paymentCoin: string,
    clockId?: string
  ): Promise<this> {
    // Get Clock object ID if not provided
    const clock = clockId || (await getClockObject(this.client));

    this.tx.moveCall({
      package: this.packageId,
      module: MODULES.MEMBER_REGISTRY,
      function: MEMBER_REGISTRY_FUNCTIONS.JOIN_REGISTRY,
      arguments: [
        this.tx.object(registryId), // registry: &mut Registry
        this.tx.object(paymentCoin), // payment: Coin<SUI>
        this.tx.pure.string(domain), // domain: String
        this.tx.object(clock), // clock: &Clock
      ],
    });

    return this;
  }

  /**
   * Builds a transaction to withdraw funds (admin only)
   * 
   * @param registryId - Registry object ID
   * @param adminCapId - Admin capability object ID
   * @param amount - Amount to withdraw in MIST
   * @returns This builder instance for method chaining
   * 
   * @example
   * ```typescript
   * builder.withdraw(registryId, adminCapId, 1000000000); // 1 SUI
   * ```
   */
  withdraw(registryId: string, adminCapId: string, amount: number | bigint): this {
    this.tx.moveCall({
      package: this.packageId,
      module: MODULES.MEMBER_REGISTRY,
      function: MEMBER_REGISTRY_FUNCTIONS.WITHDRAW,
      arguments: [
        this.tx.object(registryId), // registry: &mut Registry
        this.tx.object(adminCapId), // admin_cap: &AdminCap
        this.tx.pure.u64(amount), // amount: u64
      ],
    });

    return this;
  }

  /**
   * Builds a transaction to update the membership fee (admin only)
   * 
   * @param registryId - Registry object ID
   * @param adminCapId - Admin capability object ID
   * @param newFee - New fee amount in MIST
   * @returns This builder instance for method chaining
   * 
   * @example
   * ```typescript
   * builder.updateFee(registryId, adminCapId, 2000000000); // 2 SUI
   * ```
   */
  updateFee(registryId: string, adminCapId: string, newFee: number | bigint): this {
    this.tx.moveCall({
      package: this.packageId,
      module: MODULES.MEMBER_REGISTRY,
      function: MEMBER_REGISTRY_FUNCTIONS.UPDATE_FEE,
      arguments: [
        this.tx.object(registryId), // registry: &mut Registry
        this.tx.object(adminCapId), // admin_cap: &AdminCap
        this.tx.pure.u64(newFee), // new_fee: u64
      ],
    });

    return this;
  }

  /**
   * Builds a transaction to remove a member (admin only)
   * 
   * @param registryId - Registry object ID
   * @param adminCapId - Admin capability object ID
   * @param memberAddress - Address of the member to remove
   * @returns This builder instance for method chaining
   * 
   * @example
   * ```typescript
   * builder.removeMember(registryId, adminCapId, '0x...');
   * ```
   */
  removeMember(registryId: string, adminCapId: string, memberAddress: string): this {
    this.tx.moveCall({
      package: this.packageId,
      module: MODULES.MEMBER_REGISTRY,
      function: MEMBER_REGISTRY_FUNCTIONS.REMOVE_MEMBER,
      arguments: [
        this.tx.object(registryId), // registry: &mut Registry
        this.tx.object(adminCapId), // admin_cap: &AdminCap
        this.tx.pure.address(memberAddress), // member: address
      ],
    });

    return this;
  }
}

