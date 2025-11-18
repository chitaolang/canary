/**
 * Sui Client Factory
 * 
 * This module provides utilities for creating Sui clients with network presets
 * and custom configurations.
 */

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

/**
 * Supported network types
 */
export type NetworkType = 'mainnet' | 'testnet' | 'devnet' | 'localnet';

/**
 * Network configuration interface
 */
export interface NetworkConfig {
  /** Full node RPC URL */
  fullnode: string;
  /** WebSocket URL (optional) */
  websocket?: string;
}

/**
 * Network configuration map
 */
const NETWORK_CONFIGS: Record<NetworkType, NetworkConfig> = {
  mainnet: {
    fullnode: 'https://fullnode.mainnet.sui.io:443',
    websocket: 'wss://fullnode.mainnet.sui.io:443',
  },
  testnet: {
    fullnode: 'https://fullnode.testnet.sui.io:443',
    websocket: 'wss://fullnode.testnet.sui.io:443',
  },
  devnet: {
    fullnode: 'https://fullnode.devnet.sui.io:443',
    websocket: 'wss://fullnode.devnet.sui.io:443',
  },
  localnet: {
    fullnode: 'http://127.0.0.1:9000',
    websocket: 'ws://127.0.0.1:9000',
  },
};

/**
 * Gets the network configuration for a given network name
 * 
 * @param network - Network name ('mainnet', 'testnet', 'devnet', 'localnet') or custom URL
 * @returns Network configuration with fullnode and optional websocket URLs
 * 
 * @example
 * ```typescript
 * const config = getNetworkConfig('testnet');
 * console.log(config.fullnode); // 'https://fullnode.testnet.sui.io:443'
 * ```
 */
export function getNetworkConfig(network: NetworkType | string): NetworkConfig {
  // If it's a known network type, return the preset config
  if (network in NETWORK_CONFIGS) {
    return NETWORK_CONFIGS[network as NetworkType];
  }

  // Otherwise, treat it as a custom URL
  return {
    fullnode: network,
    websocket: network.replace(/^http/, 'ws').replace(/^https/, 'wss'),
  };
}

/**
 * Creates a Sui client for the specified network
 * 
 * @param network - Network name ('mainnet', 'testnet', 'devnet', 'localnet') or custom RPC URL
 * @returns Configured SuiClient instance
 * 
 * @example
 * ```typescript
 * // Using preset network
 * const client = createSuiClient('testnet');
 * 
 * // Using custom URL
 * const customClient = createSuiClient('https://custom-rpc.example.com');
 * ```
 */
export function createSuiClient(network: NetworkType | string): SuiClient {
  const config = getNetworkConfig(network);

  // If it's a known network type, use getFullnodeUrl for consistency
  if (network in NETWORK_CONFIGS) {
    return new SuiClient({
      url: getFullnodeUrl(network as NetworkType),
    });
  }

  // For custom URLs, use the provided URL directly
  return new SuiClient({
    url: config.fullnode,
  });
}

/**
 * Creates a Sui client with custom options
 * 
 * @param options - Client configuration options
 * @returns Configured SuiClient instance
 * 
 * @example
 * ```typescript
 * const client = createSuiClientWithOptions({
 *   network: 'testnet',
 *   // Additional options can be passed here
 * });
 * ```
 */
export function createSuiClientWithOptions(options: {
  network?: NetworkType | string;
  url?: string;
}): SuiClient {
  if (options.url) {
    // If URL is explicitly provided, use it
    return new SuiClient({
      url: options.url,
    });
  }

  if (options.network) {
    // Use network preset
    return createSuiClient(options.network);
  }

  // Default to testnet if nothing is specified
  return createSuiClient('testnet');
}

