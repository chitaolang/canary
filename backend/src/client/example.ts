/**
 * Example usage of the Client Creation module
 * 
 * This file demonstrates how to use the SuiClientFactory and CanaryClient
 * to interact with the Sui blockchain and Canary contract.
 */

import { createSuiClient, getNetworkConfig } from './sui-client-factory';
import { CanaryClient } from './canary-client';
import { KeyManager } from '../key';

/**
 * Example: Create a Sui client with network preset
 */
export function exampleCreateSuiClient() {
  // Create client for testnet
  const testnetClient = createSuiClient('testnet');
  console.log('Created testnet client');

  // Create client for mainnet
  const mainnetClient = createSuiClient('mainnet');
  console.log('Created mainnet client');

  // Create client for devnet
  const devnetClient = createSuiClient('devnet');
  console.log('Created devnet client');

  // Create client for localnet
  const localnetClient = createSuiClient('localnet');
  console.log('Created localnet client');

  // Create client with custom URL
  const customClient = createSuiClient('https://custom-rpc.example.com');
  console.log('Created custom client');

  return testnetClient;
}

/**
 * Example: Get network configuration
 */
export function exampleGetNetworkConfig() {
  const testnetConfig = getNetworkConfig('testnet');
  console.log('Testnet config:', testnetConfig);
  // Output: { fullnode: 'https://fullnode.testnet.sui.io:443', websocket: 'wss://...' }

  const customConfig = getNetworkConfig('https://custom-rpc.example.com');
  console.log('Custom config:', customConfig);
  // Output: { fullnode: 'https://custom-rpc.example.com', websocket: 'wss://...' }

  return testnetConfig;
}

/**
 * Example: Create CanaryClient with network preset
 */
export function exampleCreateCanaryClient() {
  // Example package ID (replace with actual deployed package ID)
  const packageId = '0x...'; // Replace with actual package ID

  // Create client without signer (for read-only operations)
  const readOnlyClient = new CanaryClient({
    network: 'testnet',
    packageId,
  });
  console.log('Created read-only CanaryClient');

  // Set registry ID later
  readOnlyClient.setRegistryId('0x...'); // Replace with actual registry ID

  return readOnlyClient;
}

/**
 * Example: Create CanaryClient with signer
 */
export function exampleCreateCanaryClientWithSigner() {
  // Load keypair
  const keyManager = new KeyManager();
  const bech32Key = 'suiprivkey1...'; // Replace with actual key
  const keypair = keyManager.loadFromBech32(bech32Key);
  const address = keyManager.getAddress(keypair);
  console.log('Loaded keypair for address:', address);

  // Example package ID (replace with actual deployed package ID)
  const packageId = '0x...'; // Replace with actual package ID
  const registryId = '0x...'; // Replace with actual registry ID

  // Create client with signer
  const client = new CanaryClient({
    network: 'testnet',
    signer: keypair,
    packageId,
    registryId,
  });
  console.log('Created CanaryClient with signer');

  // Get signer address
  const signerAddress = client.getSignerAddress();
  console.log('Signer address:', signerAddress);

  return client;
}

/**
 * Example: Create CanaryClient with custom RPC URL
 */
export function exampleCreateCanaryClientWithCustomUrl() {
  const packageId = '0x...'; // Replace with actual package ID

  const client = new CanaryClient({
    fullnode: 'https://custom-rpc.example.com',
    packageId,
  });
  console.log('Created CanaryClient with custom URL');

  return client;
}

/**
 * Example: Update CanaryClient configuration
 */
export function exampleUpdateCanaryClient() {
  const packageId = '0x...'; // Replace with actual package ID

  const client = new CanaryClient({
    network: 'testnet',
    packageId,
  });

  // Set registry ID
  client.setRegistryId('0x...'); // Replace with actual registry ID
  console.log('Set registry ID:', client.registryId);

  // Load and set signer
  const keyManager = new KeyManager();
  const keypair = keyManager.loadFromBech32('suiprivkey1...'); // Replace with actual key
  client.setSigner(keypair);
  console.log('Set signer, address:', client.getSignerAddress());

  // Validate configuration
  try {
    client.validateConfig();
    console.log('Configuration is valid');
  } catch (error) {
    console.error('Configuration error:', error);
  }

  return client;
}

/**
 * Example: Query chain information
 */
export async function exampleQueryChainInfo() {
  const client = createSuiClient('testnet');

  try {
    // Get chain identifier
    const chainId = await client.getChainIdentifier();
    console.log('Chain ID:', chainId);

    // Get reference gas price
    const gasPrice = await client.getReferenceGasPrice();
    console.log('Reference gas price:', gasPrice);

    // Get latest checkpoint
    const checkpoint = await client.getLatestCheckpointSequenceNumber();
    console.log('Latest checkpoint:', checkpoint);
  } catch (error) {
    console.error('Error querying chain info:', error);
  }
}

// Run examples (uncomment to test)
// exampleCreateSuiClient();
// exampleGetNetworkConfig();
// exampleCreateCanaryClient();
// exampleCreateCanaryClientWithSigner();
// exampleCreateCanaryClientWithCustomUrl();
// exampleUpdateCanaryClient();
// exampleQueryChainInfo();

