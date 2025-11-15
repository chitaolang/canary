//! Sui Canary SDK Library
//!
//! A library that simplifies interaction with the Sui blockchain, specifically designed
//! for the Canary contract. Provides utilities for:
//! - Private key management (loading Bech32-encoded keys)
//! - Sui client creation
//! - Transaction building
//! - Canary contract helpers

pub mod error;
pub mod keystore;

// Re-export commonly used types
pub use sui_sdk::types::base_types::SuiAddress;
pub use sui_sdk::types::crypto::{SignatureScheme, SuiKeyPair};

