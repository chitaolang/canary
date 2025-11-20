/**
 * Transaction Block Builder
 * 
 * Base class for building Sui transaction blocks.
 * Provides common functionality for setting gas, sender, and building transactions.
 */

import { Transaction } from '@mysten/sui/transactions';
import type { SuiClient } from '@mysten/sui/client';

/**
 * TransactionBlockBuilder - Base class for building transactions
 * 
 * This class provides a foundation for building Sui transactions with
 * common configuration options like gas budget, gas payment, and sender.
 * 
 * @example
 * ```typescript
 * const builder = new TransactionBlockBuilder(client, packageId);
 * builder.setGasBudget(1000000);
 * builder.setSender('0x...');
 * const tx = builder.build();
 * ```
 */
export class TransactionBlockBuilder {
  /** The transaction being built */
  protected readonly tx: Transaction;

  /** Sui client instance */
  protected readonly client: SuiClient;

  /** Package ID of the contract */
  public readonly packageId: string;

  /**
   * Creates a new TransactionBlockBuilder instance
   * 
   * @param client - Sui client instance
   * @param packageId - Package ID of the deployed contract
   */
  constructor(client: SuiClient, packageId: string, tx?: Transaction) {
    this.client = client;
    this.packageId = packageId;
    this.tx = tx ?? new Transaction();
  }

  /**
   * Sets the gas budget for the transaction
   * 
   * @param budget - Gas budget in MIST
   * @returns This builder instance for method chaining
   * 
   * @example
   * ```typescript
   * builder.setGasBudget(1000000);
   * ```
   */
  setGasBudget(budget: number | bigint): this {
    this.tx.setGasBudget(budget);
    return this;
  }

  /**
   * Sets the gas payment objects
   * 
   * @param payments - Array of object IDs to use for gas payment
   * @returns This builder instance for method chaining
   * 
   * @example
   * ```typescript
   * builder.setGasPayment(['0x...', '0x...']);
   * ```
   */
  setGasPayment(payments: string[]): this {
    // Convert string IDs to ObjectRef format
    const objectRefs = payments.map((id) => {
      // ObjectRef format: { objectId, version, digest }
      // For gas payment, we typically just need the object ID
      // The SDK will resolve the version and digest
      return id;
    });
    this.tx.setGasPayment(objectRefs as any);
    return this;
  }

  /**
   * Sets the sender address for the transaction
   * 
   * @param sender - Sender address
   * @returns This builder instance for method chaining
   * 
   * @example
   * ```typescript
   * builder.setSender('0x...');
   * ```
   */
  setSender(sender: string): this {
    this.tx.setSender(sender);
    return this;
  }

  /**
   * Sets the gas price for the transaction
   * 
   * @param price - Gas price in MIST
   * @returns This builder instance for method chaining
   */
  setGasPrice(price: number | bigint): this {
    this.tx.setGasPrice(price);
    return this;
  }

  /**
   * Sets the transaction expiration
   * 
   * @param expiration - Expiration epoch in milliseconds, or null for no expiration
   * @returns This builder instance for method chaining
   */
  setExpiration(expiration: number | null): this {
    if (expiration === null) {
      this.tx.setExpiration(null);
    } else {
      this.tx.setExpiration({ Epoch: expiration });
    }
    return this;
  }

  /**
   * Gets the underlying Transaction object
   * 
   * @returns The Transaction instance
   */
  getTransaction(): Transaction {
    return this.tx;
  }

  /**
   * Builds the transaction
   * 
   * @param options - Optional build options
   * @returns The built transaction bytes
   * 
   * @example
   * ```typescript
   * const txBytes = await builder.build();
   * ```
   */
  async build(options?: { onlyTransactionKind?: boolean }): Promise<Uint8Array> {
    return await this.tx.build({ client: this.client, ...options });
  }

  /**
   * Serializes the transaction to a string
   * 
   * @returns Serialized transaction string
   */
  serialize(): string {
    return this.tx.serialize();
  }
}

