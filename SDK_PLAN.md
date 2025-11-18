# Canary Contract TypeScript SDK - Implementation Plan

## Overview
This document outlines the plan for building a TypeScript SDK library to interact with the Canary contract on Sui blockchain. The SDK will provide easy-to-use utilities for key management, client creation, and transaction building.

## Project Structure

```
sdk/
├── src/
│   ├── index.ts                 # Main entry point, exports all public APIs
│   ├── client/
│   │   ├── canary-client.ts     # Main CanaryClient class
│   │   └── sui-client-factory.ts # Sui client creation utilities
│   ├── key/
│   │   ├── key-manager.ts       # Key management and Bech32 parsing
│   │   └── bech32-parser.ts     # Bech32 private key parser
│   ├── transactions/
│   │   ├── transaction-builder.ts # TransactionBlockBuilder class
│   │   ├── member-registry.ts    # Member registry transaction methods
│   │   └── pkg-storage.ts        # Package storage transaction methods
│   ├── queries/
│   │   ├── member-queries.ts     # Member registry query functions
│   │   └── canary-queries.ts     # Canary blob query functions
│   ├── types/
│   │   ├── contract-types.ts     # Contract struct type definitions
│   │   └── errors.ts             # Custom error classes
│   └── utils/
│       ├── constants.ts          # Contract constants (package ID, module names)
│       ├── helpers.ts            # Utility functions (derive address, format amounts)
│       └── errors.ts             # Error code mappings
├── package.json
├── tsconfig.json
└── README.md
```

## Core Components

### 1. Key Management (`src/key/`)

#### Bech32 Parser (`bech32-parser.ts`)
- **Purpose**: Parse Bech32 encoded private keys from `sui keytool export`
- **Format**: `suiprivkey1...` (33 bytes: 1 byte flag + 32 bytes private key)
- **Functions**:
  - `parseBech32PrivateKey(bech32String: string): Uint8Array`
  - `validateBech32PrivateKey(bech32String: string): boolean`

#### Key Manager (`key-manager.ts`)
- **Purpose**: Load and manage private keys, add to Sui keystore
- **Class**: `KeyManager`
- **Methods**:
  - `loadFromBech32(bech32Key: string, keyScheme?: 'ED25519' | 'Secp256k1' | 'Secp256r1'): Keypair`
  - `addToKeystore(keypair: Keypair): string` (returns address)
  - `getKeypair(address: string): Keypair`
  - `getAddress(keypair: Keypair): string`

### 2. Client Creation (`src/client/`)

#### Sui Client Factory (`sui-client-factory.ts`)
- **Purpose**: Simplify Sui client creation with network presets
- **Functions**:
  - `createSuiClient(network: 'mainnet' | 'testnet' | 'devnet' | 'localnet' | string): SuiClient`
  - `getNetworkConfig(network: string): { fullnode: string, websocket?: string }`

#### Canary Client (`canary-client.ts`)
- **Purpose**: Main client class combining all functionality
- **Class**: `CanaryClient`
- **Properties**:
  - `client: SuiClient`
  - `signer: Keypair | Signer`
  - `packageId: string`
  - `registryId: string`
- **Methods**:
  - Constructor: `new CanaryClient(options: CanaryClientOptions)`
  - Transaction methods (delegated to TransactionBlockBuilder)
  - Query methods (delegated to query functions)
  - `setSigner(signer: Keypair | Signer): void`
  - `setRegistryId(registryId: string): void`

### 3. Transaction Building (`src/transactions/`)

#### Transaction Block Builder (`transaction-builder.ts`)
- **Purpose**: Base class for building transaction blocks
- **Class**: `TransactionBlockBuilder`
- **Properties**:
  - `txb: TransactionBlock`
  - `client: SuiClient`
  - `packageId: string`
- **Methods**:
  - `build(): TransactionBlock`
  - `setGasBudget(budget: number): this`
  - `setGasPayment(payment: string[]): this`
  - `setSender(sender: string): this`

#### Member Registry Transactions (`member-registry.ts`)
- **Purpose**: Transaction methods for member registry operations
- **Methods**:
  - `joinRegistry(registryId: string, domain: string, paymentCoin: string, clockId: string): this`
  - `withdraw(registryId: string, adminCapId: string, amount: number): this`
  - `updateFee(registryId: string, adminCapId: string, newFee: number): this`
  - `removeMember(registryId: string, adminCapId: string, memberAddress: string): this`

#### Package Storage Transactions (`pkg-storage.ts`)
- **Purpose**: Transaction methods for canary blob operations
- **Methods**:
  - `storeBlob(registryId: string, adminCapId: string, domain: string, contractBlobId: string, explainBlobId: string, packageId: string, clockId: string): this`
  - `updateBlob(registryId: string, adminCapId: string, canaryBlobId: string, newContractBlobId: string, newExplainBlobId: string, clockId: string): this`
  - `deleteCanaryBlob(registryId: string, adminCapId: string, canaryBlobId: string): this`

### 4. Query Functions (`src/queries/`)

#### Member Queries (`member-queries.ts`)
- **Purpose**: Read-only queries for member registry
- **Functions**:
  - `isMember(client: SuiClient, registryId: string, address: string): Promise<boolean>`
  - `getMemberInfo(client: SuiClient, registryId: string, address: string): Promise<MemberInfo | null>`
  - `getAllMembers(client: SuiClient, registryId: string): Promise<MemberInfoWithAddress[]>`
  - `getRegistryInfo(client: SuiClient, registryId: string): Promise<RegistryInfo>`
  - `getAdmin(client: SuiClient, registryId: string): Promise<string>`
  - `getFee(client: SuiClient, registryId: string): Promise<number>`

#### Canary Queries (`canary-queries.ts`)
- **Purpose**: Read-only queries for canary blobs
- **Functions**:
  - `deriveCanaryAddress(client: SuiClient, registryId: string, domain: string, packageId: string): Promise<string>`
  - `canaryExists(client: SuiClient, registryId: string, domain: string, packageId: string): Promise<boolean>`
  - `getCanaryBlob(client: SuiClient, canaryBlobId: string): Promise<CanaryBlob | null>`
  - `getBlobIds(client: SuiClient, canaryBlobId: string): Promise<{ contractBlobId: string, explainBlobId: string }>`
  - `getFullInfo(client: SuiClient, canaryBlobId: string): Promise<CanaryBlobFullInfo>`

### 5. Type Definitions (`src/types/`)

#### Contract Types (`contract-types.ts`)
```typescript
interface Registry {
  id: string;
  members: Table<address, MemberInfo>;
  memberAddresses: Table<u64, address>;
  memberCount: number;
  fee: number;
  balance: Balance<SUI>;
  admin: string;
}

interface MemberInfo {
  domain: string;
  joinedAt: number;
}

interface MemberInfoWithAddress {
  member: string;
  domain: string;
  joinedAt: number;
}

interface AdminCap {
  id: string;
  registryId: string;
}

interface MembershipCap {
  id: string;
  registryId: string;
  member: string;
}

interface CanaryBlob {
  id: string;
  contractBlobId: string;
  explainBlobId: string;
  packageId: string;
  domain: string;
  uploadedAt: number;
  uploadedByAdmin: string;
}

interface CanaryClientOptions {
  network?: 'mainnet' | 'testnet' | 'devnet' | 'localnet' | string;
  fullnode?: string;
  signer?: Keypair | Signer;
  packageId: string;
  registryId?: string;
}
```

#### Errors (`errors.ts`)
- Custom error classes for contract errors:
  - `CanaryError` (base class)
  - `InsufficientPaymentError`
  - `AlreadyMemberError`
  - `NotAdminError`
  - `NotMemberError`
  - `InvalidCapError`
  - `DerivedObjectAlreadyExistsError`

### 6. Utilities (`src/utils/`)

#### Constants (`constants.ts`)
- Package ID (to be set at runtime or via config)
- Module names: `'member_registry'`, `'pkg_storage'`
- Function names for all entry points
- Error code mappings

#### Helpers (`helpers.ts`)
- `deriveCanaryAddress(registryId: string, domain: string, packageId: string): string`
- `formatSUI(mist: number): string` (convert MIST to SUI)
- `parseSUI(sui: string): number` (convert SUI to MIST)
- `formatTimestamp(timestamp: number): Date`
- `getClockObject(client: SuiClient): Promise<string>` (get Clock object ID)

## API Design Examples

### Basic Usage

```typescript
import { CanaryClient, KeyManager, createSuiClient } from '@canary/sdk';

// 1. Load private key from Bech32 format
const keyManager = new KeyManager();
const keypair = keyManager.loadFromBech32('suiprivkey1...');
const address = keyManager.getAddress(keypair);

// 2. Create Sui client
const client = createSuiClient('testnet');

// 3. Create Canary client
const canaryClient = new CanaryClient({
  network: 'testnet',
  signer: keypair,
  packageId: '0x...',
  registryId: '0x...',
});

// 4. Query member info
const isMember = await canaryClient.isMember(address);
const memberInfo = await canaryClient.getMemberInfo(address);

// 5. Join registry
const txb = canaryClient.transactionBuilder();
txb.joinRegistry('example.com', paymentCoinId, clockId);
const result = await canaryClient.signAndExecuteTransaction(txb);
```

### Advanced Usage

```typescript
// Store canary blob (admin only)
const txb = canaryClient.transactionBuilder();
txb.storeBlob(
  'example.com',
  contractBlobId,
  explainBlobId,
  packageId,
  clockId
);
const result = await canaryClient.signAndExecuteTransaction(txb);

// Derive canary address
const canaryAddress = await canaryClient.deriveCanaryAddress(
  'example.com',
  packageId
);

// Check if canary exists
const exists = await canaryClient.canaryExists('example.com', packageId);
```

## Additional Features to Consider

### 1. Event Listening
- Subscribe to contract events (member joined, blob stored, etc.)
- `subscribeToEvents(eventType: string, callback: Function): Subscription`

### 2. Batch Operations
- Batch multiple transactions
- `batchTransactions(transactions: TransactionBlock[]): Promise<TransactionResult[]>`

### 3. Gas Estimation
- Estimate gas costs before execution
- `estimateGas(txb: TransactionBlock): Promise<number>`

### 4. Retry Logic
- Automatic retry for failed transactions
- Configurable retry attempts and backoff

### 5. Type Safety
- Strong typing for all contract interactions
- TypeScript generics for return types

### 6. Validation
- Input validation for all functions
- Contract state validation before transactions

### 7. Logging
- Configurable logging levels
- Transaction and query logging

### 8. Testing Utilities
- Mock client for testing
- Test fixtures and helpers

## Dependencies

```json
{
  "dependencies": {
    "@mysten/sui.js": "^latest",
    "@mysten/bcs": "^latest",
    "bech32": "^2.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "ts-node": "^10.9.0",
    "@types/jest": "^29.0.0",
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0"
  }
}
```

## Implementation Order

1. **Phase 1: Foundation**
   - Project setup (package.json, tsconfig.json)
   - Install dependencies
   - Basic type definitions

2. **Phase 2: Key Management**
   - Bech32 parser
   - KeyManager class
   - Tests for key loading

3. **Phase 3: Client Creation**
   - SuiClientFactory
   - CanaryClient skeleton

4. **Phase 4: Query Functions**
   - Member queries
   - Canary queries
   - Integration with CanaryClient

5. **Phase 5: Transaction Building**
   - TransactionBlockBuilder base class
   - Member registry transactions
   - Package storage transactions

6. **Phase 6: Integration**
   - Complete CanaryClient implementation
   - Error handling
   - Helper utilities

7. **Phase 7: Documentation & Examples**
   - README.md
   - JSDoc comments
   - Example usage files

8. **Phase 8: Testing & Refinement**
   - Unit tests
   - Integration tests
   - Bug fixes and improvements

## Notes

- Package ID and Registry ID should be configurable (not hardcoded)
- Support both mainnet and testnet deployments
- Handle network-specific differences (Clock object ID, etc.)
- Consider adding support for custom RPC endpoints
- Ensure all functions are properly typed and documented
- Follow Sui SDK best practices and patterns

