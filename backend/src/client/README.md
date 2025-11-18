# Client Creation Module

This module provides utilities for creating and managing Sui clients, specifically for interacting with the Canary contract.

## Features

- **SuiClientFactory**: Easy creation of Sui clients with network presets
- **CanaryClient**: Main client class combining Sui client, signer management, and contract configuration
- **Network Support**: Built-in support for mainnet, testnet, devnet, and localnet
- **Custom URLs**: Support for custom RPC endpoints

## Usage

### Basic Sui Client Creation

```typescript
import { createSuiClient } from './client';

// Create client for testnet
const client = createSuiClient('testnet');

// Create client for mainnet
const mainnetClient = createSuiClient('mainnet');

// Create client with custom URL
const customClient = createSuiClient('https://custom-rpc.example.com');
```

### CanaryClient Creation

```typescript
import { CanaryClient } from './client';
import { KeyManager } from '../key';

// Create read-only client (no signer)
const client = new CanaryClient({
  network: 'testnet',
  packageId: '0x...', // Your deployed package ID
  registryId: '0x...', // Registry object ID (optional, can be set later)
});

// Create client with signer
const keyManager = new KeyManager();
const keypair = keyManager.loadFromBech32('suiprivkey1...');

const clientWithSigner = new CanaryClient({
  network: 'testnet',
  signer: keypair,
  packageId: '0x...',
  registryId: '0x...',
});
```

### Updating Client Configuration

```typescript
// Set registry ID
client.setRegistryId('0x...');

// Set or change signer
const newKeypair = keyManager.loadFromBech32('suiprivkey2...');
client.setSigner(newKeypair);

// Get signer address
const address = client.getSignerAddress();
console.log('Signer address:', address);

// Validate configuration
client.validateConfig(); // Throws if packageId or registryId is missing
```

## API Reference

### `createSuiClient(network: NetworkType | string): SuiClient`

Creates a Sui client for the specified network.

**Parameters:**
- `network`: Network name ('mainnet', 'testnet', 'devnet', 'localnet') or custom RPC URL

**Returns:** Configured `SuiClient` instance

### `getNetworkConfig(network: NetworkType | string): NetworkConfig`

Gets the network configuration for a given network.

**Returns:**
```typescript
{
  fullnode: string;
  websocket?: string;
}
```

### `CanaryClient`

Main client class for interacting with the Canary contract.

#### Constructor

```typescript
new CanaryClient(options: CanaryClientOptions)
```

**Options:**
- `network?`: Network name or custom RPC URL
- `fullnode?`: Custom fullnode URL (overrides network)
- `signer?`: Keypair or Signer instance
- `packageId`: Package ID of deployed contract (required)
- `registryId?`: Registry object ID (optional)

#### Properties

- `client: SuiClient` - The underlying Sui client
- `packageId: string` - Package ID (read-only)
- `signer: Keypair | Signer | undefined` - Current signer
- `registryId: string | undefined` - Registry object ID

#### Methods

- `setSigner(signer: Keypair | Signer): void` - Set or update the signer
- `setRegistryId(registryId: string): void` - Set or update the registry ID
- `getSignerAddress(): string` - Get the signer's address
- `hasSigner(): boolean` - Check if signer is set
- `validateConfig(): void` - Validate that required config is set

## Network Presets

The following network presets are available:

| Network | Fullnode URL | WebSocket URL |
|---------|-------------|---------------|
| mainnet | `https://fullnode.mainnet.sui.io:443` | `wss://fullnode.mainnet.sui.io:443` |
| testnet | `https://fullnode.testnet.sui.io:443` | `wss://fullnode.testnet.sui.io:443` |
| devnet | `https://fullnode.devnet.sui.io:443` | `wss://fullnode.devnet.sui.io:443` |
| localnet | `http://127.0.0.1:9000` | `ws://127.0.0.1:9000` |

## Examples

See [example.ts](./example.ts) for more detailed usage examples.

## Next Steps

After creating a client, you can:
1. Use query functions to read contract state
2. Use transaction builders to create and execute transactions
3. Combine with KeyManager for key management

See the main SDK documentation for more details.

