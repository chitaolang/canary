/**
 * Example usage of the Key Management module
 * 
 * This file demonstrates how to use the KeyManager and Bech32 parser
 * to load and manage Sui private keys.
 */

import { KeyManager, parseBech32PrivateKey, validateBech32PrivateKey } from './index';

/**
 * Example: Load a key from Bech32 format
 */
export function exampleLoadKey() {
    // Example Bech32 private key (this is a placeholder - use your actual key)
    const bech32Key = 'suiprivkey...'; // Replace with actual key from `sui keytool export`

    // Validate the key format first
    if (!validateBech32PrivateKey(bech32Key)) {
        console.error('Invalid Bech32 private key format');
        return;
    }

    // Create a key manager
    const keyManager = new KeyManager();

    try {
        // Load the keypair
        const keypair = keyManager.loadFromBech32(bech32Key);

        // Get the address
        const address = keyManager.getAddress(keypair);
        console.log('Loaded address:', address);

        // Store it with an alias
        keyManager.addKeypair('my-account', keypair);
        console.log('Keypair stored with alias "my-account"');

        // Retrieve it later
        const storedKeypair = keyManager.getKeypair('my-account');
        const storedAddress = keyManager.getAddress(storedKeypair);
        console.log('Retrieved address:', storedAddress);

        return keypair;
    } catch (error) {
        console.error('Failed to load key:', error);
        throw error;
    }
}

/**
 * Example: Parse a key manually
 */
export function exampleParseKey() {
    const bech32Key = 'suiprivkey1...'; // Replace with actual key

    try {
        const parsed = parseBech32PrivateKey(bech32Key);
        console.log('Key scheme:', parsed.scheme);
        console.log('Private key length:', parsed.privateKey.length, 'bytes');

        // You can now use the parsed data to create a keypair manually
        // const keypair = Ed25519Keypair.fromSecretKey(parsed.privateKey);
    } catch (error) {
        console.error('Failed to parse key:', error);
        throw error;
    }
}

/**
 * Example: Manage multiple keys
 */
export function exampleMultipleKeys() {
    const keyManager = new KeyManager();

    // Load multiple keys
    const key1 = 'suiprivkey1...'; // Replace with actual keys
    const key2 = 'suiprivkey1...';

    try {
        const keypair1 = keyManager.loadFromBech32(key1);
        const keypair2 = keyManager.loadFromBech32(key2);

        // Store with different aliases
        keyManager.addKeypair('account-1', keypair1);
        keyManager.addKeypair('account-2', keypair2);

        // List all stored keys
        const aliases = keyManager.listKeypairs();
        console.log('Stored keys:', aliases);

        // Get addresses for all keys
        aliases.forEach((alias) => {
            const keypair = keyManager.getKeypair(alias);
            const address = keyManager.getAddress(keypair);
            console.log(`${alias}: ${address}`);
        });

        // Remove a key
        keyManager.removeKeypair('account-1');
        console.log('Removed account-1');

        // Clear all keys
        keyManager.clear();
        console.log('Cleared all keys');
    } catch (error) {
        console.error('Failed to manage keys:', error);
        throw error;
    }
}

/**
 * Example: Load key with explicit scheme
 */
export function exampleLoadWithScheme() {
    const keyManager = new KeyManager();
    const bech32Key = 'suiprivkey1...'; // Replace with actual key

    try {
        // Load with explicit ED25519 scheme (usually auto-detected)
        const keypair = keyManager.loadFromBech32(bech32Key, {
            keyScheme: 'ED25519',
        });

        const address = keyManager.getAddress(keypair);
        console.log('Address:', address);
        return keypair;
    } catch (error) {
        console.error('Failed to load key with scheme:', error);
        throw error;
    }
}

// Run examples (uncomment to test)
exampleLoadKey();
// exampleParseKey();
// exampleMultipleKeys();
// exampleLoadWithScheme();

