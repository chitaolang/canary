# Sui Rust SDK Library - Implementation Plan

## Overview

This document outlines the plan for building a Rust library that simplifies interaction with the Sui blockchain, specifically designed for the Canary contract. The library will provide three main components:

1. **Private Key Management**: Load Bech32-encoded private keys from `sui keytool export` into the keystore
2. **Sui Client Builder**: Simplified client creation with network presets
3. **Transaction Builder**: Helper functions for creating and executing transaction blocks

## Architecture

### Module Structure

```
src/
├── lib.rs                 # Main library entry point
├── keystore.rs            # Private key parsing and keystore management
├── client.rs              # Sui client builder utilities
├── transaction.rs         # Transaction block builder helpers
├── canary.rs              # Canary contract-specific helpers
└── error.rs               # Custom error types
```

### Dependencies

Additional dependencies needed in `Cargo.toml`:

```toml
# Bech32 encoding/decoding for private key parsing
bech32 = "0.9"

# For keystore operations (if needed beyond sui_sdk)
# sui_sdk already includes keystore functionality
```

## Implementation Details

### 1. Private Key Management (`keystore.rs`)

#### 1.1 Bech32 Private Key Parser

**Objective**: Parse Bech32-encoded private keys exported from `sui keytool export` (format: `suiprivkey...`)

**Implementation**:
- Parse the Bech32 string to extract the HRP (human-readable part) and data
- Validate that HRP is `suiprivkey`
- Decode the Bech32 data to get the raw bytes (33 bytes: 1 byte flag + 32 bytes private key)
- Extract the key scheme from the first byte (flag):
  - `0x00` = Ed25519
  - `0x01` = Secp256k1
  - `0x02` = Secp256r1

**Key Functions**:
```rust
pub fn parse_bech32_private_key(bech32_str: &str) -> Result<ParsedPrivateKey, KeystoreError>
pub fn add_to_keystore(keystore: &mut Keystore, parsed_key: ParsedPrivateKey) -> Result<SuiAddress, KeystoreError>
```

**ParsedPrivateKey Structure**:

`ParsedPrivateKey` is an intermediate struct that holds the decoded private key information after parsing the Bech32 string. It serves as a bridge between parsing and keystore operations, allowing for validation and separation of concerns.

```rust
pub struct ParsedPrivateKey {
    /// The raw private key bytes (32 bytes)
    pub private_key_bytes: [u8; 32],
    /// The cryptographic scheme used (Ed25519, Secp256k1, or Secp256r1)
    pub scheme: SignatureScheme,
    /// The flag byte from the Bech32 encoding (first byte of the 33-byte payload)
    pub flag: u8,
}
```

**Purpose**:
- **Separation of Concerns**: Separates the parsing logic from keystore operations, making the code more modular and testable
- **Validation**: Allows validation of the parsed key before attempting to add it to the keystore
- **Reusability**: The parsed key can be used for other operations (e.g., deriving the address, creating signers) without needing to re-parse
- **Type Safety**: Provides a strongly-typed representation of the parsed key with the scheme information

**Usage Flow**:
1. `parse_bech32_private_key()` → Returns `ParsedPrivateKey` (parsing + validation)
2. `add_to_keystore()` → Takes `ParsedPrivateKey` and adds it to keystore (keystore operation)
3. Alternative: Use `ParsedPrivateKey` directly to create a signer or derive address without keystore

**References**:
- Sui Keytool documentation: https://docs.sui.io/references/cli/keytool
- Bech32 format specification

#### 1.2 Keystore Integration

**Objective**: Add parsed private keys to Sui keystore

**Implementation**:
- Use `sui_sdk::keystore::Keystore` for in-memory keystore
- Use `sui_sdk::keystore::FileBasedKeystore` for persistent keystore
- Support both in-memory and file-based keystores
- Return the Sui address derived from the private key

**Key Functions**:
```rust
pub fn load_key_to_keystore(keystore: &mut Keystore, bech32_key: &str) -> Result<SuiAddress, KeystoreError>
pub fn create_keystore_from_key(bech32_key: &str) -> Result<(Keystore, SuiAddress), KeystoreError>
```

### 2. Sui Client Builder (`client.rs`)

#### 2.1 Network Presets

**Objective**: Simplify client creation with network presets

**Implementation**:
- Create a `Network` enum with variants: `Localnet`, `Devnet`, `Testnet`, `Mainnet`, `Custom(String)`
- Provide default RPC URLs for each network
- Use `SuiClientBuilder` from `sui_sdk` to build clients

**Key Functions**:
```rust
pub enum Network {
    Localnet,
    Devnet,
    Testnet,
    Mainnet,
    Custom(String),
}

pub async fn create_sui_client(network: Network) -> Result<SuiClient, ClientError>
pub async fn create_sui_client_with_url(url: &str) -> Result<SuiClient, ClientError>
```

**Default URLs**:
- Localnet: `http://127.0.0.1:9000`
- Devnet: `https://fullnode.devnet.sui.io:443`
- Testnet: `https://fullnode.testnet.sui.io:443`
- Mainnet: `https://fullnode.mainnet.sui.io:443`

#### 2.2 Client with Keystore

**Objective**: Create client with pre-configured keystore

**Implementation**:
- Combine client creation with keystore setup
- Return a struct that holds both client and signer

**Key Functions**:
```rust
pub struct SuiClientWithSigner {
    pub client: SuiClient,
    pub signer: SuiAddress,
    pub keystore: Keystore,
}

pub async fn create_client_with_key(
    network: Network,
    bech32_key: &str,
) -> Result<SuiClientWithSigner, ClientError>
```

### 3. Transaction Builder (`transaction.rs`)

#### 3.1 Transaction Block Builder

**Objective**: Simplify transaction block creation

**Implementation**:
- Wrap `TransactionBuilder` from `sui_sdk`
- Provide helper methods for common operations:
  - Move call transactions
  - Transfer SUI
  - Transfer objects
  - Programmable transactions

**Key Functions**:
```rust
pub struct CanaryTransactionBuilder {
    builder: TransactionBuilder,
    client: SuiClient,
    signer: SuiAddress,
    keystore: Keystore,
}

impl CanaryTransactionBuilder {
    pub fn new(client: SuiClient, signer: SuiAddress, keystore: Keystore) -> Self
    pub fn move_call(&mut self, package: ObjectID, module: &str, function: &str, args: Vec<CallArg>) -> Result<&mut Self, TransactionError>
    pub fn transfer_sui(&mut self, recipient: SuiAddress, amount: u64) -> Result<&mut Self, TransactionError>
    pub async fn build(&mut self) -> Result<TransactionBlock, TransactionError>
    pub async fn execute(&mut self) -> Result<TransactionEffects, TransactionError>
}
```

#### 3.2 Gas Management

**Objective**: Handle gas estimation and payment

**Implementation**:
- Automatically estimate gas costs
- Use gas objects from the signer's address
- Support custom gas budgets

**Key Functions**:
```rust
pub async fn estimate_gas(&self, transaction: &TransactionBlock) -> Result<u64, TransactionError>
pub fn set_gas_budget(&mut self, budget: u64) -> &mut Self
pub fn set_gas_object(&mut self, gas_object: ObjectID) -> &mut Self
```

### 4. Canary Contract Helpers (`canary.rs`)

#### 4.1 Contract Function Wrappers

**Objective**: Provide high-level functions for Canary contract operations

**Implementation**:
- Wrap Move function calls with proper type conversions
- Handle object ID lookups
- Provide convenient parameter builders

**Key Functions**:

**Member Registry Functions**:
```rust
pub async fn join_registry(
    client: &SuiClientWithSigner,
    registry_id: ObjectID,
    domain: String,
    payment_amount: u64,
) -> Result<TransactionEffects, CanaryError>

pub async fn query_registry(
    client: &SuiClient,
    registry_id: ObjectID,
) -> Result<RegistryInfo, CanaryError>

pub async fn query_member(
    client: &SuiClient,
    registry_id: ObjectID,
    member_address: SuiAddress,
) -> Result<Option<MemberInfo>, CanaryError>
```

**Package Storage Functions**:
```rust
pub async fn store_blob(
    client: &SuiClientWithSigner,
    registry_id: ObjectID,
    admin_cap_id: ObjectID,
    domain: String,
    contract_blob_id: ObjectID,
    explain_blob_id: ObjectID,
    package_id: ObjectID,
) -> Result<TransactionEffects, CanaryError>

pub async fn update_blob(
    client: &SuiClientWithSigner,
    admin_cap_id: ObjectID,
    canary_blob_id: ObjectID,
    new_contract_blob_id: ObjectID,
    new_explain_blob_id: ObjectID,
) -> Result<TransactionEffects, CanaryError>

pub async fn delete_canary_blob(
    client: &SuiClientWithSigner,
    registry_id: ObjectID,
    admin_cap_id: ObjectID,
    canary_blob_id: ObjectID,
) -> Result<TransactionEffects, CanaryError>

pub async fn derive_canary_address(
    client: &SuiClient,
    registry_id: ObjectID,
    domain: String,
    package_id: ObjectID,
) -> Result<SuiAddress, CanaryError>

pub async fn query_canary_blob(
    client: &SuiClient,
    canary_blob_id: ObjectID,
) -> Result<CanaryBlobInfo, CanaryError>
```

#### 4.2 Type Definitions

**Objective**: Define Rust structs matching Move structs

**Implementation**:
- Create structs for `Registry`, `MemberInfo`, `CanaryBlob`, etc.
- Implement serialization/deserialization with `serde`

**Key Types**:
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegistryInfo {
    pub id: ObjectID,
    pub fee: u64,
    pub member_count: u64,
    pub admin: SuiAddress,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemberInfo {
    pub domain: String,
    pub joined_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CanaryBlobInfo {
    pub id: ObjectID,
    pub contract_blob_id: ObjectID,
    pub explain_blob_id: ObjectID,
    pub package_id: ObjectID,
    pub domain: String,
    pub uploaded_at: u64,
    pub uploaded_by_admin: SuiAddress,
}
```

### 5. Error Handling (`error.rs`)

#### 5.1 Custom Error Types

**Objective**: Provide clear, actionable error messages

**Implementation**:
- Use `thiserror` for error definitions
- Create error types for each module

**Key Error Types**:
```rust
#[derive(Debug, thiserror::Error)]
pub enum KeystoreError {
    #[error("Invalid Bech32 format: {0}")]
    InvalidBech32(String),
    #[error("Invalid HRP: expected 'suiprivkey', got '{0}'")]
    InvalidHRP(String),
    #[error("Invalid key length: expected 33 bytes, got {0}")]
    InvalidKeyLength(usize),
    #[error("Unsupported key scheme: {0}")]
    UnsupportedKeyScheme(u8),
    #[error("Keystore error: {0}")]
    KeystoreOperation(String),
}

#[derive(Debug, thiserror::Error)]
pub enum ClientError {
    #[error("Failed to create Sui client: {0}")]
    ClientCreation(String),
    #[error("Network error: {0}")]
    Network(String),
    #[error("Invalid URL: {0}")]
    InvalidUrl(String),
}

#[derive(Debug, thiserror::Error)]
pub enum TransactionError {
    #[error("Transaction build error: {0}")]
    BuildError(String),
    #[error("Transaction execution error: {0}")]
    ExecutionError(String),
    #[error("Insufficient gas: required {required}, available {available}")]
    InsufficientGas { required: u64, available: u64 },
    #[error("Object not found: {0}")]
    ObjectNotFound(ObjectID),
}

#[derive(Debug, thiserror::Error)]
pub enum CanaryError {
    #[error("Registry error: {0}")]
    Registry(String),
    #[error("Not a member")]
    NotMember,
    #[error("Not admin")]
    NotAdmin,
    #[error("Canary blob not found")]
    CanaryBlobNotFound,
    #[error(transparent)]
    Transaction(#[from] TransactionError),
    #[error(transparent)]
    Client(#[from] ClientError),
}
```

## Additional Considerations

### 6. Testing

**Unit Tests**:
- Test Bech32 key parsing with various formats
- Test keystore operations
- Test client creation for each network
- Test transaction building

**Integration Tests**:
- Test end-to-end flow: load key → create client → execute transaction
- Test Canary contract interactions (may require testnet/devnet)

### 7. Documentation

**Code Documentation**:
- Add comprehensive doc comments to all public functions
- Include usage examples in doc comments
- Document error conditions

**Example Code**:
- Create example file showing all three main features
- Include examples for each Canary contract function

### 8. Security Considerations

- Never log or expose private keys
- Use secure key storage practices
- Validate all inputs before processing
- Handle errors gracefully without exposing sensitive information

### 9. Performance

- Cache client connections when possible
- Batch transaction operations when applicable
- Use async/await efficiently

## Implementation Order

1. **Phase 1: Foundation**
   - Set up module structure
   - Implement error types
   - Add Bech32 dependency

2. **Phase 2: Private Key Management**
   - Implement Bech32 parser
   - Implement keystore integration
   - Add tests

3. **Phase 3: Client Builder**
   - Implement network presets
   - Implement client creation
   - Add client + keystore combo

4. **Phase 4: Transaction Builder**
   - Implement transaction builder wrapper
   - Add gas management
   - Add execution helpers

5. **Phase 5: Canary Contract Helpers**
   - Implement type definitions
   - Implement contract function wrappers
   - Add query helpers

6. **Phase 6: Polish**
   - Add comprehensive tests
   - Write documentation
   - Create examples
   - Performance optimization

## References

- Sui Rust SDK Documentation: https://docs.sui.io/references/rust-sdk
- Sui Keytool Documentation: https://docs.sui.io/references/cli/keytool
- Sui Move Transaction API: https://docs.sui.io/references/rust-sdk
- Bech32 Specification: https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki

