# Transaction Building Module

This module provides transaction builders for interacting with the Canary contract on Sui.

## Features

- **TransactionBlockBuilder**: Base class for building Sui transactions
- **MemberRegistryTransactionBuilder**: Builder for member registry operations
- **PackageStorageTransactionBuilder**: Builder for canary blob operations
- **Method Chaining**: Fluent API for building complex transactions
- **Gas Management**: Easy configuration of gas budget and payment

## Usage

### Basic Transaction Building

```typescript
import { MemberRegistryTransactionBuilder } from './transactions';
import { CanaryClient } from './client';

const client = new CanaryClient({
  network: 'testnet',
  packageId: '0x...',
  registryId: '0x...',
});

const builder = new MemberRegistryTransactionBuilder(client.client, packageId);

// Build transaction
await builder.joinRegistry(registryId, 'example.com', paymentCoinId);
builder.setGasBudget(10000000);

// Build and execute
const txBytes = await builder.build();
const result = await client.client.signAndExecuteTransaction({
  signer: client.signer!,
  transaction: txBytes,
});
```

### Member Registry Transactions

#### Join Registry

```typescript
const builder = new MemberRegistryTransactionBuilder(client.client, packageId);
await builder.joinRegistry(registryId, 'example.com', paymentCoinId);
builder.setGasBudget(10000000);
```

#### Withdraw (Admin Only)

```typescript
const builder = new MemberRegistryTransactionBuilder(client.client, packageId);
builder.withdraw(registryId, adminCapId, parseSUI('1')); // 1 SUI
builder.setGasBudget(10000000);
```

#### Update Fee (Admin Only)

```typescript
const builder = new MemberRegistryTransactionBuilder(client.client, packageId);
builder.updateFee(registryId, adminCapId, parseSUI('2')); // 2 SUI
builder.setGasBudget(10000000);
```

#### Remove Member (Admin Only)

```typescript
const builder = new MemberRegistryTransactionBuilder(client.client, packageId);
builder.removeMember(registryId, adminCapId, memberAddress);
builder.setGasBudget(10000000);
```

### Package Storage Transactions

#### Store Blob (Admin Only)

```typescript
const builder = new PackageStorageTransactionBuilder(client.client, packageId);
await builder.storeBlob(
  registryId,
  adminCapId,
  'example.com',
  'core',
  contractBlobId,
  explainBlobId,
  canaryPackageId
);
builder.setGasBudget(10000000);
```

#### Update Blob (Admin Only)

```typescript
const builder = new PackageStorageTransactionBuilder(client.client, packageId);
await builder.updateBlob(
  registryId,
  adminCapId,
  canaryBlobId,
  newContractBlobId,
  newExplainBlobId
);
builder.setGasBudget(10000000);
```

#### Delete Canary Blob (Admin Only)

```typescript
const builder = new PackageStorageTransactionBuilder(client.client, packageId);
builder.deleteCanaryBlob(registryId, adminCapId, canaryBlobId);
builder.setGasBudget(10000000);
```

## API Reference

### TransactionBlockBuilder

Base class for building transactions.

#### Methods

- `setGasBudget(budget: number | bigint): this` - Set gas budget in MIST
- `setGasPayment(payments: string[]): this` - Set gas payment object IDs
- `setSender(sender: string): this` - Set sender address
- `setGasPrice(price: number | bigint): this` - Set gas price
- `setExpiration(expiration: number | null): this` - Set transaction expiration
- `build(options?): Promise<Uint8Array>` - Build transaction bytes
- `serialize(): string` - Serialize transaction to string
- `getTransaction(): Transaction` - Get underlying Transaction object

### MemberRegistryTransactionBuilder

Builder for member registry operations.

#### Methods

- `joinRegistry(registryId, domain, paymentCoin, clockId?): Promise<this>` - Join registry
- `withdraw(registryId, adminCapId, amount): this` - Withdraw funds
- `updateFee(registryId, adminCapId, newFee): this` - Update membership fee
- `removeMember(registryId, adminCapId, memberAddress): this` - Remove member

### PackageStorageTransactionBuilder

Builder for canary blob operations.

#### Methods

- `storeBlob(registryId, adminCapId, domain, moduleName, contractBlobId, explainBlobId, canaryPackageId, clockId?): Promise<this>` - Store canary blob
- `updateBlob(registryId, adminCapId, canaryBlobId, newContractBlobId, newExplainBlobId, clockId?): Promise<this>` - Update canary blob
- `deleteCanaryBlob(registryId, adminCapId, canaryBlobId): this` - Delete canary blob

## Transaction Execution

After building a transaction, you need to sign and execute it:

```typescript
// Build transaction
const txBytes = await builder.build();

// Sign and execute
const result = await client.client.signAndExecuteTransaction({
  signer: keypair,
  transaction: txBytes,
});

console.log('Transaction digest:', result.digest);
```

## Gas Management

### Setting Gas Budget

```typescript
builder.setGasBudget(10000000); // 0.01 SUI in MIST
```

### Setting Gas Payment

```typescript
builder.setGasPayment(['0x...', '0x...']); // Use specific coins for gas
```

### Automatic Gas Estimation

The SDK doesn't automatically estimate gas, but you can use the client's gas estimation:

```typescript
const gasPrice = await client.client.getReferenceGasPrice();
// Use gasPrice to calculate appropriate budget
```

## Error Handling

Transaction execution may fail with contract errors. See the error handling module for details on how to handle these errors.

## Examples

See [example.ts](./example.ts) for more detailed usage examples.

