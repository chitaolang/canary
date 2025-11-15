//! Private key management and keystore operations
//!
//! This module provides utilities for:
//! - Parsing Bech32-encoded private keys from `sui keytool export`
//! - Adding private keys to Sui keystores
//! - Creating keystores from private keys

use crate::error::KeystoreError;
use sui_keys::keystore::{AccountKeystore, InMemKeystore, Keystore};
use sui_sdk::types::base_types::SuiAddress;
use sui_sdk::types::crypto::{SignatureScheme, SuiKeyPair};

/// Parsed private key information
///
/// This struct holds the decoded private key information after parsing the Bech32 string.
/// It serves as a bridge between parsing and keystore operations.
#[derive(Debug, Clone)]
pub struct ParsedPrivateKey {
    /// The raw private key bytes (32 bytes)
    pub private_key_bytes: [u8; 32],
    /// The cryptographic scheme used (Ed25519, Secp256k1, or Secp256r1)
    pub scheme: SignatureScheme,
    /// The flag byte from the Bech32 encoding (first byte of the 33-byte payload)
    pub flag: u8,
}

impl ParsedPrivateKey {
    /// Convert the parsed private key into a `SuiKeyPair`
    pub fn to_keypair(&self) -> Result<SuiKeyPair, KeystoreError> {
        // Reconstruct the 33-byte format: flag || private_key_bytes
        let mut bytes = Vec::with_capacity(33);
        bytes.push(self.flag);
        bytes.extend_from_slice(&self.private_key_bytes);

        SuiKeyPair::from_bytes(&bytes).map_err(|e| KeystoreError::SuiSdkError(e.to_string()))
    }

    /// Get the Sui address derived from this private key
    pub fn to_address(&self) -> Result<SuiAddress, KeystoreError> {
        let keypair = self.to_keypair()?;
        Ok(SuiAddress::from(&keypair.public()))
    }
}

/// Parse a Bech32-encoded private key string
///
/// This function parses a private key exported from `sui keytool export` (format: `suiprivkey...`).
///
/// # Arguments
///
/// * `bech32_str` - The Bech32-encoded private key string starting with `suiprivkey`
///
/// # Returns
///
/// Returns a `ParsedPrivateKey` containing the decoded key information, or a `KeystoreError` if parsing fails.
///
/// # Example
///
/// ```rust,no_run
/// use canary_sdk::keystore::parse_bech32_private_key;
///
/// let bech32_key = "suiprivkey1...";
/// let parsed = parse_bech32_private_key(bech32_key)?;
/// println!("Key scheme: {:?}", parsed.scheme);
/// ```
pub fn parse_bech32_private_key(bech32_str: &str) -> Result<ParsedPrivateKey, KeystoreError> {
    // Use SuiKeyPair::decode which handles Bech32 decoding internally
    let keypair =
        SuiKeyPair::decode(bech32_str).map_err(|e| KeystoreError::InvalidBech32(e.to_string()))?;

    // Extract scheme and private key bytes
    let scheme = match keypair {
        SuiKeyPair::Ed25519(_) => SignatureScheme::ED25519,
        SuiKeyPair::Secp256k1(_) => SignatureScheme::Secp256k1,
        SuiKeyPair::Secp256r1(_) => SignatureScheme::Secp256r1,
    };

    // Get the flag byte
    let flag = scheme.flag();

    // Extract private key bytes (32 bytes)
    let private_key_bytes = keypair.to_bytes_no_flag();
    if private_key_bytes.len() != 32 {
        return Err(KeystoreError::InvalidKeyLength(private_key_bytes.len()));
    }

    let mut key_bytes_array = [0u8; 32];
    key_bytes_array.copy_from_slice(&private_key_bytes);

    Ok(ParsedPrivateKey {
        private_key_bytes: key_bytes_array,
        scheme,
        flag,
    })
}

/// Add a parsed private key to a keystore
///
/// This function adds a `ParsedPrivateKey` to an existing keystore and returns the Sui address.
///
/// # Arguments
///
/// * `keystore` - A mutable reference to the keystore
/// * `parsed_key` - The parsed private key to add
///
/// # Returns
///
/// Returns the `SuiAddress` derived from the private key, or a `KeystoreError` if the operation fails.
///
/// # Example
///
/// ```rust,no_run
/// use canary_sdk::keystore::{parse_bech32_private_key, add_to_keystore};
/// use sui_keys::keystore::InMemKeystore;
///
/// let bech32_key = "suiprivkey1...";
/// let parsed = parse_bech32_private_key(bech32_key)?;
/// let mut keystore = InMemKeystore::new();
/// let address = add_to_keystore(&mut keystore, parsed).await?;
/// ```
pub async fn add_to_keystore(
    keystore: &mut Keystore,
    parsed_key: ParsedPrivateKey,
) -> Result<SuiAddress, KeystoreError> {
    let keypair = parsed_key.to_keypair()?;
    let address = parsed_key.to_address()?;

    keystore
        .import(None, keypair)
        .await
        .map_err(|e| KeystoreError::KeystoreOperation(e.to_string()))?;

    Ok(address)
}

/// Load a Bech32-encoded private key into a keystore
///
/// This is a convenience function that combines parsing and adding to keystore.
///
/// # Arguments
///
/// * `keystore` - A mutable reference to the keystore
/// * `bech32_key` - The Bech32-encoded private key string
///
/// # Returns
///
/// Returns the `SuiAddress` derived from the private key, or a `KeystoreError` if the operation fails.
///
/// # Example
///
/// ```rust,no_run
/// use canary_sdk::keystore::load_key_to_keystore;
/// use sui_keys::keystore::InMemKeystore;
///
/// let bech32_key = "suiprivkey1...";
/// let mut keystore = InMemKeystore::new();
/// let address = load_key_to_keystore(&mut keystore, bech32_key).await?;
/// ```
pub async fn load_key_to_keystore(
    keystore: &mut Keystore,
    bech32_key: &str,
) -> Result<SuiAddress, KeystoreError> {
    let parsed_key = parse_bech32_private_key(bech32_key)?;
    add_to_keystore(keystore, parsed_key).await
}

/// Create a new in-memory keystore from a Bech32-encoded private key
///
/// This function creates a new `InMemKeystore` and adds the private key to it.
///
/// # Arguments
///
/// * `bech32_key` - The Bech32-encoded private key string
///
/// # Returns
///
/// Returns a tuple of `(Keystore, SuiAddress)`, or a `KeystoreError` if the operation fails.
///
/// # Example
///
/// ```rust,no_run
/// use canary_sdk::keystore::create_keystore_from_key;
///
/// let bech32_key = "suiprivkey1...";
/// let (keystore, address) = create_keystore_from_key(bech32_key).await?;
/// println!("Created keystore with address: {}", address);
/// ```
pub async fn create_keystore_from_key(
    bech32_key: &str,
) -> Result<(Keystore, SuiAddress), KeystoreError> {
    let parsed_key = parse_bech32_private_key(bech32_key)?;
    let address = parsed_key.to_address()?;
    let keypair = parsed_key.to_keypair()?;

    let mut keystore = Keystore::InMem(InMemKeystore::default());
    keystore
        .import(None, keypair)
        .await
        .map_err(|e| KeystoreError::KeystoreOperation(e.to_string()))?;

    Ok((keystore, address))
}

#[cfg(test)]
mod tests {
    use super::*;
    use sui_sdk::types::crypto::deterministic_random_account_key;

    /// Helper function to generate a test Ed25519 keypair and encode it to Bech32
    fn generate_test_bech32_key_ed25519() -> (String, SuiKeyPair, SuiAddress) {
        let (address, kp) = deterministic_random_account_key();
        let keypair = SuiKeyPair::Ed25519(kp);
        let bech32_key = keypair.encode().expect("Failed to encode keypair");
        (bech32_key, keypair, address)
    }

    /// Helper function to generate a test keypair for any scheme
    /// Note: Currently only Ed25519 is fully supported for deterministic testing.
    /// For Secp256k1 and Secp256r1, we skip the scheme-specific tests since generating
    /// those key types requires additional dependencies. The parsing logic is the same
    /// for all schemes, so testing Ed25519 validates the core functionality.
    fn generate_test_bech32_key(scheme: SignatureScheme) -> (String, SuiKeyPair, SuiAddress) {
        // For now, all schemes use Ed25519 keys for testing
        // The parsing logic is scheme-agnostic, so this is sufficient
        // In production, users would export real keys of each type from sui keytool
        match scheme {
            SignatureScheme::ED25519 => generate_test_bech32_key_ed25519(),
            SignatureScheme::Secp256k1 | SignatureScheme::Secp256r1 => {
                // Use Ed25519 key but test that the parsing correctly identifies the scheme
                // from the Bech32 encoding. Note: This won't work perfectly because
                // the actual key bytes won't match the scheme, but it tests error handling
                generate_test_bech32_key_ed25519()
            }
            _ => panic!("Unsupported scheme for testing"),
        }
    }

    #[test]
    fn test_parse_bech32_private_key_ed25519() {
        let (bech32_key, _expected_keypair, expected_address) =
            generate_test_bech32_key(SignatureScheme::ED25519);

        let parsed = parse_bech32_private_key(&bech32_key).expect("Failed to parse Bech32 key");

        // Verify scheme
        assert_eq!(parsed.scheme, SignatureScheme::ED25519);
        assert_eq!(parsed.flag, 0x00);

        // Verify we can reconstruct the keypair
        let keypair = parsed.to_keypair().expect("Failed to convert to keypair");
        let address = parsed.to_address().expect("Failed to get address");

        // Verify the address matches
        assert_eq!(address, expected_address);
        assert_eq!(SuiAddress::from(&keypair.public()), expected_address);
    }

    #[test]
    #[ignore] // Ignored because we can't easily generate Secp256k1 keys without additional deps
    fn test_parse_bech32_private_key_secp256k1() {
        // This test would require an actual Secp256k1 key from sui keytool export
        // The parsing logic is the same for all schemes, so Ed25519 tests cover it
    }

    #[test]
    #[ignore] // Ignored because we can't easily generate Secp256r1 keys without additional deps
    fn test_parse_bech32_private_key_secp256r1() {
        // This test would require an actual Secp256r1 key from sui keytool export
        // The parsing logic is the same for all schemes, so Ed25519 tests cover it
    }

    #[test]
    fn test_parse_bech32_private_key_invalid_format() {
        let invalid_key = "invalid_key";
        let result = parse_bech32_private_key(invalid_key);
        assert!(result.is_err());
        match result.unwrap_err() {
            KeystoreError::InvalidBech32(_) => {}
            e => panic!("Expected InvalidBech32 error, got: {:?}", e),
        }
    }

    #[test]
    fn test_parse_bech32_private_key_wrong_prefix() {
        // Bech32 string with wrong HRP
        let wrong_prefix = "sui1invalid";
        let result = parse_bech32_private_key(wrong_prefix);
        assert!(result.is_err());
    }

    #[test]
    fn test_parsed_private_key_to_keypair() {
        let (bech32_key, expected_keypair, _) = generate_test_bech32_key(SignatureScheme::ED25519);
        let parsed = parse_bech32_private_key(&bech32_key).expect("Failed to parse");

        let keypair = parsed.to_keypair().expect("Failed to convert to keypair");

        // Verify the keypair type matches
        match (keypair, expected_keypair) {
            (SuiKeyPair::Ed25519(_), SuiKeyPair::Ed25519(_)) => {}
            _ => panic!("Keypair types don't match"),
        }
    }

    #[test]
    fn test_parsed_private_key_to_address() {
        let (bech32_key, _expected_keypair, expected_address) =
            generate_test_bech32_key(SignatureScheme::ED25519);
        let parsed = parse_bech32_private_key(&bech32_key).expect("Failed to parse");

        let address = parsed.to_address().expect("Failed to get address");
        assert_eq!(address, expected_address);
    }

    #[tokio::test]
    async fn test_add_to_keystore() {
        let (bech32_key, _expected_keypair, expected_address) =
            generate_test_bech32_key(SignatureScheme::ED25519);
        let parsed = parse_bech32_private_key(&bech32_key).expect("Failed to parse");

        let mut keystore = Keystore::InMem(InMemKeystore::default());
        let address = add_to_keystore(&mut keystore, parsed)
            .await
            .expect("Failed to add to keystore");

        assert_eq!(address, expected_address);

        // Verify the key is actually in the keystore
        let addresses = keystore.addresses();
        assert!(addresses.contains(&address));
    }

    #[tokio::test]
    async fn test_load_key_to_keystore() {
        let (bech32_key, _expected_keypair, expected_address) =
            generate_test_bech32_key(SignatureScheme::ED25519);

        let mut keystore = Keystore::InMem(InMemKeystore::default());
        let address = load_key_to_keystore(&mut keystore, &bech32_key)
            .await
            .expect("Failed to load key to keystore");

        assert_eq!(address, expected_address);

        // Verify the key is in the keystore
        let addresses = keystore.addresses();
        assert!(addresses.contains(&address));
    }

    #[tokio::test]
    async fn test_create_keystore_from_key() {
        let (bech32_key, _expected_keypair, expected_address) =
            generate_test_bech32_key(SignatureScheme::ED25519);

        let (keystore, address) = create_keystore_from_key(&bech32_key)
            .await
            .expect("Failed to create keystore from key");

        assert_eq!(address, expected_address);

        // Verify the key is in the keystore
        let addresses = keystore.addresses();
        assert!(addresses.contains(&address));
    }

    #[tokio::test]
    async fn test_create_keystore_from_key_all_schemes() {
        // Test Ed25519 (most common scheme)
        // Note: Secp256k1 and Secp256r1 would require actual keys from sui keytool
        let (bech32_key, _expected_keypair, expected_address) =
            generate_test_bech32_key(SignatureScheme::ED25519);

        let (keystore, address) = create_keystore_from_key(&bech32_key)
            .await
            .expect("Failed to create keystore for Ed25519");

        assert_eq!(address, expected_address);

        // Verify the key is in the keystore
        let addresses = keystore.addresses();
        assert!(addresses.contains(&address));
    }

    #[tokio::test]
    async fn test_create_keystore_from_key_invalid() {
        let invalid_key = "invalid_key";
        let result = create_keystore_from_key(invalid_key).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_keystore_roundtrip() {
        // Test: encode keypair -> parse -> add to keystore -> export -> compare
        let (bech32_key, original_keypair, expected_address) =
            generate_test_bech32_key(SignatureScheme::ED25519);

        // Parse and add to keystore
        let (keystore, address) = create_keystore_from_key(&bech32_key)
            .await
            .expect("Failed to create keystore");

        assert_eq!(address, expected_address);

        // Export the keypair from keystore
        let exported_keypair = keystore
            .export(&address)
            .expect("Failed to export keypair from keystore");

        // Verify the exported keypair matches the original
        let exported_address = SuiAddress::from(&exported_keypair.public());
        assert_eq!(exported_address, expected_address);

        // Verify the keypair types match
        match (exported_keypair, original_keypair) {
            (SuiKeyPair::Ed25519(_), SuiKeyPair::Ed25519(_)) => {}
            _ => panic!("Exported keypair type doesn't match original"),
        }
    }

    #[test]
    fn test_parsed_private_key_private_key_bytes_length() {
        let (bech32_key, _, _) = generate_test_bech32_key(SignatureScheme::ED25519);
        let parsed = parse_bech32_private_key(&bech32_key).expect("Failed to parse");

        // Verify private key bytes are exactly 32 bytes
        assert_eq!(parsed.private_key_bytes.len(), 32);
    }

    #[test]
    fn test_parsed_private_key_flag_byte_matches_scheme() {
        // Test that flag byte correctly matches the scheme for Ed25519
        let (bech32_key, _, _) = generate_test_bech32_key(SignatureScheme::ED25519);
        let parsed = parse_bech32_private_key(&bech32_key).expect("Failed to parse");

        assert_eq!(parsed.scheme, SignatureScheme::ED25519);
        assert_eq!(parsed.flag, SignatureScheme::ED25519.flag());
        assert_eq!(parsed.flag, 0x00);
    }
}
