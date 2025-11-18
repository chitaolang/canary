/**
 * Key Manager
 * 
 * This module provides a KeyManager class for loading and managing
 * private keys from Bech32 format and creating Sui keypairs.
 */

// Import keypairs from Sui SDK
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import type { Keypair } from '@mysten/sui/cryptography';
import {
    Secp256k1Keypair,
} from '@mysten/sui/keypairs/secp256k1';
import {
    Secp256r1Keypair,
} from '@mysten/sui/keypairs/secp256r1';
import {
    parseBech32PrivateKey,
    validateBech32PrivateKey,
    type ParsedPrivateKey,
    KeyScheme,
    getKeySchemeName,
} from './bech32-parser';

/**
 * Key scheme type for TypeScript
 */
export type KeySchemeType = 'ED25519' | 'Secp256k1' | 'Secp256r1';

/**
 * Options for loading a key from Bech32 format
 */
export interface LoadKeyOptions {
    /** Optional key scheme override. If not provided, will be detected from Bech32 string */
    keyScheme?: KeySchemeType;
}

/**
 * KeyManager class for managing Sui keypairs
 * 
 * Provides methods to:
 * - Load private keys from Bech32 format (suiprivkey)
 * - Create keypairs from private keys
 * - Get addresses from keypairs
 * - Manage multiple keypairs in memory
 * 
 * @example
 * ```typescript
 * const keyManager = new KeyManager();
 * 
 * // Load key from Bech32 format
 * const keypair = keyManager.loadFromBech32('suiprivkey1...');
 * 
 * // Get address
 * const address = keyManager.getAddress(keypair);
 * 
 * // Store keypair for later use
 * keyManager.addKeypair('my-key', keypair);
 * 
 * // Retrieve stored keypair
 * const stored = keyManager.getKeypair('my-key');
 * ```
 */
export class KeyManager {
    private keypairs: Map<string, Keypair> = new Map();

    /**
     * Creates a new KeyManager instance
     */
    constructor() {
        // Initialize empty keypair storage
    }

    /**
     * Loads a keypair from a Bech32 encoded private key string
     * 
     * @param bech32Key - The Bech32 encoded private key (e.g., 'suiprivkey1...')
     * @param options - Optional configuration (keyScheme override)
     * @returns The created keypair
     * @throws Error if the Bech32 string is invalid or keypair creation fails
     * 
     * @example
     * ```typescript
     * const keyManager = new KeyManager();
     * const keypair = keyManager.loadFromBech32('suiprivkey1...');
     * ```
     */
    loadFromBech32(
        bech32Key: string,
        options?: LoadKeyOptions
    ): Keypair {
        // Validate Bech32 format
        if (!validateBech32PrivateKey(bech32Key)) {
            throw new Error(
                'Invalid Bech32 private key format. Expected string starting with "suiprivkey"'
            );
        }

        // Parse the Bech32 string
        let parsed: ParsedPrivateKey;
        try {
            parsed = parseBech32PrivateKey(bech32Key);
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to parse Bech32 key: ${error.message}`);
            }
            throw new Error(`Failed to parse Bech32 key: ${String(error)}`);
        }

        // Override scheme if provided in options
        if (options?.keyScheme) {
            const schemeMap: Record<KeySchemeType, KeyScheme> = {
                ED25519: KeyScheme.ED25519,
                Secp256k1: KeyScheme.Secp256k1,
                Secp256r1: KeyScheme.Secp256r1,
            };
            parsed.scheme = schemeMap[options.keyScheme];
        }

        // Create keypair based on scheme
        let keypair: Keypair;

        try {
            switch (parsed.scheme) {
                case KeyScheme.ED25519:
                    keypair = Ed25519Keypair.fromSecretKey(parsed.privateKey);
                    break;
                case KeyScheme.Secp256k1:
                    keypair = Secp256k1Keypair.fromSecretKey(parsed.privateKey);
                    break;
                case KeyScheme.Secp256r1:
                    keypair = Secp256r1Keypair.fromSecretKey(parsed.privateKey);
                    break;
                default:
                    throw new Error(
                        `Unsupported key scheme: ${getKeySchemeName(parsed.scheme)}`
                    );
            }
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(
                    `Failed to create keypair from private key: ${error.message}`
                );
            }
            throw new Error(
                `Failed to create keypair from private key: ${String(error)}`
            );
        }

        return keypair;
    }

    /**
     * Gets the Sui address from a keypair
     * 
     * @param keypair - The keypair to get the address from
     * @returns The Sui address as a string
     * 
     * @example
     * ```typescript
     * const address = keyManager.getAddress(keypair);
     * console.log(address); // '0x...'
     * ```
     */
    getAddress(keypair: Keypair): string {
        return keypair.toSuiAddress();
    }

    /**
     * Gets the public key from a keypair
     * 
     * @param keypair - The keypair to get the public key from
     * @returns The public key as a Uint8Array
     */
    getPublicKey(keypair: Keypair): Uint8Array {
        return keypair.getPublicKey().toRawBytes();
    }

    /**
     * Stores a keypair in the manager's internal storage
     * 
     * @param alias - A unique alias/identifier for the keypair
     * @param keypair - The keypair to store
     * @returns The address of the stored keypair
     * 
     * @example
     * ```typescript
     * const keypair = keyManager.loadFromBech32('suiprivkey1...');
     * const address = keyManager.addKeypair('my-account', keypair);
     * ```
     */
    addKeypair(alias: string, keypair: Keypair): string {
        if (this.keypairs.has(alias)) {
            throw new Error(`Keypair with alias "${alias}" already exists`);
        }

        this.keypairs.set(alias, keypair);
        return this.getAddress(keypair);
    }

    /**
     * Retrieves a stored keypair by alias
     * 
     * @param alias - The alias of the keypair to retrieve
     * @returns The keypair if found
     * @throws Error if the alias doesn't exist
     * 
     * @example
     * ```typescript
     * const keypair = keyManager.getKeypair('my-account');
     * ```
     */
    getKeypair(alias: string): Keypair {
        const keypair = this.keypairs.get(alias);
        if (!keypair) {
            throw new Error(`Keypair with alias "${alias}" not found`);
        }
        return keypair;
    }

    /**
     * Removes a stored keypair by alias
     * 
     * @param alias - The alias of the keypair to remove
     * @returns true if the keypair was removed, false if it didn't exist
     * 
     * @example
     * ```typescript
     * keyManager.removeKeypair('my-account');
     * ```
     */
    removeKeypair(alias: string): boolean {
        return this.keypairs.delete(alias);
    }

    /**
     * Lists all stored keypair aliases
     * 
     * @returns Array of all stored aliases
     * 
     * @example
     * ```typescript
     * const aliases = keyManager.listKeypairs();
     * console.log(aliases); // ['my-account', 'another-account']
     * ```
     */
    listKeypairs(): string[] {
        return Array.from(this.keypairs.keys());
    }

    /**
     * Checks if a keypair exists for the given alias
     * 
     * @param alias - The alias to check
     * @returns true if the keypair exists, false otherwise
     */
    hasKeypair(alias: string): boolean {
        return this.keypairs.has(alias);
    }

    /**
     * Clears all stored keypairs
     * 
     * @example
     * ```typescript
     * keyManager.clear();
     * ```
     */
    clear(): void {
        this.keypairs.clear();
    }

    /**
     * Gets the count of stored keypairs
     * 
     * @returns The number of stored keypairs
     */
    getKeypairCount(): number {
        return this.keypairs.size;
    }
}

