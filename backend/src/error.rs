//! Error types for the Sui Canary SDK

use sui_sdk::types::base_types::SuiAddress;
use sui_sdk::types::crypto::SignatureScheme;

/// Errors that can occur during keystore operations
#[derive(Debug, thiserror::Error)]
pub enum KeystoreError {
    /// Invalid Bech32 format
    #[error("Invalid Bech32 format: {0}")]
    InvalidBech32(String),

    /// Invalid HRP (human-readable part) - expected 'suiprivkey'
    #[error("Invalid HRP: expected 'suiprivkey', got '{0}'")]
    InvalidHRP(String),

    /// Invalid key length
    #[error("Invalid key length: expected 33 bytes, got {0}")]
    InvalidKeyLength(usize),

    /// Unsupported key scheme
    #[error("Unsupported key scheme: {0:?}")]
    UnsupportedKeyScheme(SignatureScheme),

    /// Keystore operation error
    #[error("Keystore error: {0}")]
    KeystoreOperation(String),

    /// Error from Sui SDK
    #[error("Sui SDK error: {0}")]
    SuiSdkError(String),
}

/// Errors that can occur during client operations
#[derive(Debug, thiserror::Error)]
pub enum ClientError {
    /// Failed to create Sui client
    #[error("Failed to create Sui client: {0}")]
    ClientCreation(String),

    /// Network error
    #[error("Network error: {0}")]
    Network(String),

    /// Invalid URL
    #[error("Invalid URL: {0}")]
    InvalidUrl(String),
}

/// Errors that can occur during transaction operations
#[derive(Debug, thiserror::Error)]
pub enum TransactionError {
    /// Transaction build error
    #[error("Transaction build error: {0}")]
    BuildError(String),

    /// Transaction execution error
    #[error("Transaction execution error: {0}")]
    ExecutionError(String),

    /// Insufficient gas
    #[error("Insufficient gas: required {required}, available {available}")]
    InsufficientGas { required: u64, available: u64 },

    /// Object not found
    #[error("Object not found: {0}")]
    ObjectNotFound(SuiAddress),
}

/// Errors that can occur during Canary contract operations
#[derive(Debug, thiserror::Error)]
pub enum CanaryError {
    /// Registry error
    #[error("Registry error: {0}")]
    Registry(String),

    /// Not a member
    #[error("Not a member")]
    NotMember,

    /// Not admin
    #[error("Not admin")]
    NotAdmin,

    /// Canary blob not found
    #[error("Canary blob not found")]
    CanaryBlobNotFound,

    /// Transaction error
    #[error(transparent)]
    Transaction(#[from] TransactionError),

    /// Client error
    #[error(transparent)]
    Client(#[from] ClientError),
}

