/**
 * Canary Client
 * 
 * Main client class for interacting with the Canary contract on Sui.
 * Combines Sui client, key management, and transaction building functionality.
 */

import { SuiClient } from '@mysten/sui/client';
import type { Keypair } from '@mysten/sui/cryptography';
import type { Signer } from '@mysten/sui/cryptography';
import { createSuiClient, createSuiClientWithOptions } from './sui-client-factory';
import type { CanaryClientOptions } from '../types/contract-types';

/**
 * CanaryClient - Main client for interacting with Canary contract
 * 
 * This class provides a unified interface for:
 * - Connecting to Sui networks
 * - Managing signers for transactions
 * - Querying contract state
 * - Building and executing transactions
 * 
 * @example
 * ```typescript
 * import { CanaryClient } from './client';
 * import { KeyManager } from './key';
 * 
 * const keyManager = new KeyManager();
 * const keypair = keyManager.loadFromBech32('suiprivkey1...');
 * 
 * const client = new CanaryClient({
 *   network: 'testnet',
 *   signer: keypair,
 *   packageId: '0x...',
 *   registryId: '0x...',
 * });
 * ```
 */
export class CanaryClient {
  /** Sui client instance */
  public readonly client: SuiClient;

  /** Signer for transactions */
  private _signer: Keypair | Signer | undefined;

  /** Package ID of the deployed Canary contract */
  public readonly packageId: string;

  /** Registry object ID */
  private _registryId: string | undefined;

  /**
   * Creates a new CanaryClient instance
   * 
   * @param options - Client configuration options
   * 
   * @example
   * ```typescript
   * const client = new CanaryClient({
   *   network: 'testnet',
   *   signer: keypair,
   *   packageId: '0x...',
   *   registryId: '0x...',
   * });
   * ```
   */
  constructor(options: CanaryClientOptions) {
    // Create Sui client
    if (options.fullnode) {
      this.client = createSuiClientWithOptions({ url: options.fullnode });
    } else if (options.network) {
      this.client = createSuiClient(options.network);
    } else {
      // Default to testnet
      this.client = createSuiClient('testnet');
    }

    // Set signer if provided
    this._signer = options.signer;

    // Set package ID (required)
    if (!options.packageId) {
      throw new Error('packageId is required');
    }
    this.packageId = options.packageId;

    // Set registry ID if provided
    this._registryId = options.registryId;
  }

  /**
   * Gets the current signer
   * 
   * @returns The current signer, or undefined if not set
   */
  get signer(): Keypair | Signer | undefined {
    return this._signer;
  }

  /**
   * Sets the signer for transactions
   * 
   * @param signer - Keypair or Signer instance
   * 
   * @example
   * ```typescript
   * const keypair = keyManager.loadFromBech32('suiprivkey1...');
   * client.setSigner(keypair);
   * ```
   */
  setSigner(signer: Keypair | Signer): void {
    this._signer = signer;
  }

  /**
   * Gets the current registry ID
   * 
   * @returns The registry ID, or undefined if not set
   */
  get registryId(): string | undefined {
    return this._registryId;
  }

  /**
   * Sets the registry object ID
   * 
   * @param registryId - Registry object ID
   * 
   * @example
   * ```typescript
   * client.setRegistryId('0x...');
   * ```
   */
  setRegistryId(registryId: string): void {
    this._registryId = registryId;
  }

  /**
   * Gets the address of the current signer
   * 
   * @returns The signer's address, or undefined if no signer is set
   * @throws Error if signer is not set
   * 
   * @example
   * ```typescript
   * const address = client.getSignerAddress();
   * console.log('Signer address:', address);
   * ```
   */
  getSignerAddress(): string {
    if (!this._signer) {
      throw new Error('No signer set. Call setSigner() first.');
    }

    if ('toSuiAddress' in this._signer) {
      return this._signer.toSuiAddress();
    }

    // For Signer interface, we need to get the public key first
    // This is a simplified version - actual implementation may vary
    throw new Error('Cannot get address from Signer interface. Use Keypair instead.');
  }

  /**
   * Checks if a signer is set
   * 
   * @returns true if signer is set, false otherwise
   */
  hasSigner(): boolean {
    return this._signer !== undefined;
  }

  /**
   * Validates that required configuration is set
   * 
   * @throws Error if packageId or registryId is not set
   */
  validateConfig(): void {
    if (!this.packageId) {
      throw new Error('packageId is required');
    }
    if (!this._registryId) {
      throw new Error('registryId is required. Call setRegistryId() first.');
    }
  }
}

