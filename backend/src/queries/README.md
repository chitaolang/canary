# Query Functions Module

This module provides read-only query functions for interacting with the Canary contract on Sui.

## Features

- **Member Queries**: Query member registry state
- **Canary Queries**: Query canary blob information
- **View Functions**: Call Move view functions via `devInspectTransactionBlock`
- **Object State**: Read object state directly for better performance

## Usage

### Member Registry Queries

#### Check if Member

```typescript
import { isMember } from './queries';

const member = await isMember(client, packageId, registryId, address);
console.log(`Is member: ${member}`);
```

#### Get Member Info

```typescript
import { getMemberInfo } from './queries';

const memberInfo = await getMemberInfo(client, packageId, registryId, address);
if (memberInfo) {
  console.log(`Domain: ${memberInfo.domain}`);
  console.log(`Joined at: ${memberInfo.joinedAt}`);
}
```

#### Get All Members

```typescript
import { getAllMembers } from './queries';

const members = await getAllMembers(client, packageId, registryId);
console.log(`Total members: ${members.length}`);
```

#### Get Registry Info

```typescript
import { getRegistryInfo } from './queries';

const registryInfo = await getRegistryInfo(client, registryId);
console.log(`Member count: ${registryInfo.memberCount}`);
console.log(`Fee: ${registryInfo.fee} MIST`);
console.log(`Admin: ${registryInfo.admin}`);
```

#### Get Admin

```typescript
import { getAdmin } from './queries';

const admin = await getAdmin(client, packageId, registryId);
console.log(`Admin: ${admin}`);
```

#### Get Fee

```typescript
import { getFee } from './queries';

const fee = await getFee(client, registryId);
console.log(`Fee: ${fee} MIST`);
```

### Canary Blob Queries

#### Derive Canary Address

```typescript
import { deriveCanaryAddress } from './queries';

const address = await deriveCanaryAddress(
  client,
  packageId,
  registryId,
  'example.com',
  canaryPackageId
);
console.log(`Canary address: ${address}`);
```

#### Check if Canary Exists

```typescript
import { canaryExists } from './queries';

const exists = await canaryExists(
  client,
  packageId,
  registryId,
  'example.com',
  canaryPackageId
);
console.log(`Canary exists: ${exists}`);
```

#### Get Canary Blob

```typescript
import { getCanaryBlob } from './queries';

const blob = await getCanaryBlob(client, canaryBlobId);
if (blob) {
  console.log(`Domain: ${blob.domain}`);
  console.log(`Package ID: ${blob.packageId}`);
}
```

#### Get Blob IDs

```typescript
import { getBlobIds } from './queries';

const { contractBlobId, explainBlobId } = await getBlobIds(
  client,
  packageId,
  canaryBlobId
);
```

#### Get Full Info

```typescript
import { getFullInfo } from './queries';

const fullInfo = await getFullInfo(client, packageId, canaryBlobId);
console.log('Full info:', fullInfo);
```

## API Reference

### Member Queries

- `isMember(client, packageId, registryId, address): Promise<boolean>`
- `getMemberInfo(client, packageId, registryId, address): Promise<MemberInfo | null>`
- `getAllMembers(client, packageId, registryId): Promise<MemberInfoWithAddress[]>`
- `getRegistryInfo(client, registryId): Promise<RegistryInfo>`
- `getAdmin(client, packageId, registryId): Promise<string>`
- `getFee(client, registryId): Promise<number>`

### Canary Queries

- `deriveCanaryAddress(client, packageId, registryId, domain, canaryPackageId): Promise<string>`
- `canaryExists(client, packageId, registryId, domain, canaryPackageId): Promise<boolean>`
- `getCanaryBlob(client, canaryBlobId): Promise<CanaryBlob | null>`
- `getBlobIds(client, packageId, canaryBlobId): Promise<{ contractBlobId: string, explainBlobId: string }>`
- `getFullInfo(client, packageId, canaryBlobId): Promise<CanaryBlobFullInfo>`

## Implementation Details

### View Functions

Functions that return values (like `is_member`, `get_member_info`) are called using `devInspectTransactionBlock`, which simulates transaction execution without committing to the blockchain.

### Object State Reading

For better performance, some queries (like `getRegistryInfo`, `getCanaryBlob`) read object state directly using `getObject`, which is faster than calling view functions.

### Error Handling

All query functions include error handling and will return `null` or `false` on error, or throw an error for critical failures.

## Examples

See [example.ts](./example.ts) for more detailed usage examples.

