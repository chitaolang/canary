# Key Management Module

This module provides utilities for managing Sui private keys, specifically for loading keys exported from `sui keytool export` in Bech32 format.

## Features

- **Bech32 Parser**: Parse and validate Bech32 encoded private keys (`suiprivkey1...`)
- **Key Manager**: Load keys and create Sui keypairs (ED25519, Secp256k1, Secp256r1)
- **In-Memory Storage**: Store and manage multiple keypairs with aliases

## Usage

### Basic Usage

```typescript
import { KeyManager } from './key';

// Create a key manager instance
const keyManager = new KeyManager();

// Load a private key from Bech32 format
const bech32Key = 'suiprivkey1...'; // From `sui keytool export`
const keypair = keyManager.loadFromBech32(bech32Key);

// Get the address
const address = keyManager.getAddress(keypair);
console.log('Address:', address);

// Store the keypair for later use
keyManager.addKeypair('my-account', keypair);

// Retrieve later
const storedKeypair = keyManager.getKeypair('my-account');
```

### Advanced Usage

```typescript
import { KeyManager, parseBech32PrivateKey, KeyScheme } from './key';

// Parse a key manually
const parsed = parseBech32PrivateKey('suiprivkey1...');
console.log('Scheme:', parsed.scheme); // KeyScheme.ED25519, etc.
console.log('Private Key:', parsed.privateKey);

// Load with explicit scheme override
const keyManager = new KeyManager();
const keypair = keyManager.loadFromBech32(bech32Key, {
  keyScheme: 'ED25519'
});

// List all stored keypairs
const aliases = keyManager.listKeypairs();
console.log('Stored keys:', aliases);

// Check if a keypair exists
if (keyManager.hasKeypair('my-account')) {
  const keypair = keyManager.getKeypair('my-account');
}
```

## API Reference

### `KeyManager`

Main class for managing keypairs.

#### Methods

- `loadFromBech32(bech32Key: string, options?: LoadKeyOptions): Keypair`
  - Loads a keypair from Bech32 format
  - Returns a Sui keypair object

- `getAddress(keypair: Keypair): string`
  - Gets the Sui address from a keypair

- `getPublicKey(keypair: Keypair): Uint8Array`
  - Gets the public key bytes from a keypair

- `addKeypair(alias: string, keypair: Keypair): string`
  - Stores a keypair with an alias
  - Returns the address

- `getKeypair(alias: string): Keypair`
  - Retrieves a stored keypair by alias

- `removeKeypair(alias: string): boolean`
  - Removes a stored keypair

- `listKeypairs(): string[]`
  - Lists all stored keypair aliases

- `hasKeypair(alias: string): boolean`
  - Checks if a keypair exists

- `clear(): void`
  - Clears all stored keypairs

### `parseBech32PrivateKey(bech32String: string): ParsedPrivateKey`

Parses a Bech32 encoded private key.

**Returns:**
```typescript
{
  scheme: KeyScheme;      // KeyScheme.ED25519, etc.
  privateKey: Uint8Array; // 32-byte private key
}
```

### `validateBech32PrivateKey(bech32String: string): boolean`

Validates if a string is a valid Bech32 private key format.

## Key Scheme Support

The module supports three key schemes:

- **ED25519** (0x00): Default and most common
- **Secp256k1** (0x01): Bitcoin-style ECDSA
- **Secp256r1** (0x02): NIST P-256 ECDSA

The scheme is automatically detected from the Bech32 string, but can be overridden when loading.

## Format Details

The Bech32 format from `sui keytool export` contains:

- **Prefix**: `suiprivkey`
- **Data**: 33 bytes
  - Byte 0: Key scheme flag (0x00, 0x01, or 0x02)
  - Bytes 1-32: 32-byte private key

## Security Notes

⚠️ **Important**: Private keys are sensitive data. Always:

- Never log or expose private keys
- Store keys securely (encrypted if possible)
- Use environment variables for keys in production
- Clear keys from memory when done (if possible)

## Dependencies

- `@mysten/sui`: Sui TypeScript SDK
- `bech32`: Bech32 encoding/decoding library

## Installation

```bash
npm install @mysten/sui bech32
```

