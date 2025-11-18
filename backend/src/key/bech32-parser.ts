/**
 * Bech32 Private Key Parser
 * 
 * This module provides utilities to parse Bech32 encoded private keys
 * exported from `sui keytool export`. The format is:
 * - Prefix: `suiprivkey`
 * - Data: 33 bytes (1 byte flag + 32 bytes private key)
 * 
 * Key scheme flags:
 * - 0x00: ED25519
 * - 0x01: Secp256k1
 * - 0x02: Secp256r1
 */

import { bech32 } from 'bech32';

/**
 * Key scheme enumeration matching Sui's keytool format
 */
export enum KeyScheme {
    ED25519 = 0x00,
    Secp256k1 = 0x01,
    Secp256r1 = 0x02,
}

/**
 * Parsed private key data structure
 */
export interface ParsedPrivateKey {
    /** The key scheme flag (0x00, 0x01, or 0x02) */
    scheme: KeyScheme;
    /** The raw private key bytes (32 bytes) */
    privateKey: Uint8Array;
}

/**
 * Validates if a string is a valid Bech32 encoded Sui private key
 * 
 * @param bech32String - The Bech32 encoded string to validate
 * @returns true if the string is a valid suiprivkey format, false otherwise
 * 
 * @example
 * ```typescript
 * validateBech32PrivateKey('suiprivkey1...'); // true
 * validateBech32PrivateKey('invalid'); // false
 * ```
 */
export function validateBech32PrivateKey(bech32String: string): boolean {
    if (!bech32String || typeof bech32String !== 'string') {
        return false;
    }

    // Must start with suiprivkey prefix
    if (!bech32String.startsWith('suiprivkey')) {
        return false;
    }

    try {
        // Try to decode the Bech32 string
        const decoded = bech32.decode(bech32String);

        // Convert words to bytes
        const bytes = bech32.fromWords(decoded.words);

        // Must be exactly 33 bytes (1 flag + 32 key bytes)
        if (bytes.length !== 33) {
            return false;
        }

        // Validate key scheme flag
        const scheme = bytes[0];
        if (scheme !== KeyScheme.ED25519 &&
            scheme !== KeyScheme.Secp256k1 &&
            scheme !== KeyScheme.Secp256r1) {
            return false;
        }

        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Parses a Bech32 encoded private key from `sui keytool export`
 * 
 * @param bech32String - The Bech32 encoded private key string (e.g., 'suiprivkey1...')
 * @returns Parsed private key with scheme and key bytes
 * @throws Error if the string is invalid or cannot be parsed
 * 
 * @example
 * ```typescript
 * const parsed = parseBech32PrivateKey('suiprivkey1...');
 * console.log(parsed.scheme); // KeyScheme.ED25519
 * console.log(parsed.privateKey); // Uint8Array(32)
 * ```
 */
export function parseBech32PrivateKey(bech32String: string): ParsedPrivateKey {
    if (!bech32String || typeof bech32String !== 'string') {
        throw new Error('Invalid input: Bech32 string must be a non-empty string');
    }

    // Validate prefix
    if (!bech32String.startsWith('suiprivkey')) {
        throw new Error(
            `Invalid Bech32 private key: must start with 'suiprivkey', got: ${bech32String.substring(0, 20)}...`
        );
    }

    try {
        // Decode Bech32 string
        const decoded = bech32.decode(bech32String);

        // Convert Bech32 words to bytes
        const bytes = bech32.fromWords(decoded.words);

        // Validate length (must be 33 bytes: 1 flag + 32 key bytes)
        if (bytes.length !== 33) {
            throw new Error(
                `Invalid private key length: expected 33 bytes, got ${bytes.length} bytes`
            );
        }

        // Extract key scheme flag (first byte)
        const schemeByte = bytes[0];
        let scheme: KeyScheme;

        switch (schemeByte) {
            case KeyScheme.ED25519:
                scheme = KeyScheme.ED25519;
                break;
            case KeyScheme.Secp256k1:
                scheme = KeyScheme.Secp256k1;
                break;
            case KeyScheme.Secp256r1:
                scheme = KeyScheme.Secp256r1;
                break;
            default:
                throw new Error(
                    `Unsupported key scheme: 0x${schemeByte.toString(16).padStart(2, '0')}. ` +
                    `Supported schemes: ED25519 (0x00), Secp256k1 (0x01), Secp256r1 (0x02)`
                );
        }

        // Extract private key bytes (remaining 32 bytes)
        const privateKey = new Uint8Array(bytes.slice(1));

        // Validate private key length
        if (privateKey.length !== 32) {
            throw new Error(
                `Invalid private key length: expected 32 bytes, got ${privateKey.length} bytes`
            );
        }

        return {
            scheme,
            privateKey,
        };
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to parse Bech32 private key: ${error.message}`);
        }
        throw new Error(`Failed to parse Bech32 private key: ${String(error)}`);
    }
}

/**
 * Gets the key scheme name as a string
 * 
 * @param scheme - The key scheme enum value
 * @returns The scheme name as a string
 */
export function getKeySchemeName(scheme: KeyScheme): string {
    switch (scheme) {
        case KeyScheme.ED25519:
            return 'ED25519';
        case KeyScheme.Secp256k1:
            return 'Secp256k1';
        case KeyScheme.Secp256r1:
            return 'Secp256r1';
        default:
            return 'Unknown';
    }
}

