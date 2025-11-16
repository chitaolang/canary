//! Sui client builder utilities
//!
//! This module provides simplified client creation with network presets and
//! integration with keystores for signing transactions.

use crate::error::ClientError;
use crate::keystore::create_keystore_from_key;
use sui_keys::keystore::Keystore;
use sui_sdk::types::base_types::SuiAddress;
use sui_sdk::SuiClient;
use sui_sdk::SuiClientBuilder;

/// Network presets for Sui client connections
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Network {
    /// Local development network (default: http://127.0.0.1:9000)
    Localnet,
    /// Sui devnet (https://fullnode.devnet.sui.io:443)
    Devnet,
    /// Sui testnet (https://fullnode.testnet.sui.io:443)
    Testnet,
    /// Sui mainnet (https://fullnode.mainnet.sui.io:443)
    Mainnet,
    /// Custom network URL
    Custom(String),
}

impl Network {
    /// Get the default RPC URL for this network
    pub fn url(&self) -> &str {
        match self {
            Network::Localnet => "http://127.0.0.1:9000",
            Network::Devnet => "https://fullnode.devnet.sui.io:443",
            Network::Testnet => "https://fullnode.testnet.sui.io:443",
            Network::Mainnet => "https://fullnode.mainnet.sui.io:443",
            Network::Custom(url) => url,
        }
    }
}

/// A Sui client with an associated keystore and signer address
///
/// This struct combines a Sui client with a keystore, making it easy to
/// create and sign transactions without managing the keystore separately.
pub struct SuiClientWithSigner {
    /// The Sui client for interacting with the network
    pub client: SuiClient,
    /// The signer address derived from the keystore
    pub signer: SuiAddress,
    /// The keystore containing the private key
    pub keystore: Keystore,
}

impl SuiClientWithSigner {
    /// Get a reference to the Sui client
    pub fn client(&self) -> &SuiClient {
        &self.client
    }

    /// Get the signer address
    pub fn signer(&self) -> SuiAddress {
        self.signer
    }

    /// Get a reference to the keystore
    pub fn keystore(&self) -> &Keystore {
        &self.keystore
    }

    /// Get a mutable reference to the keystore
    pub fn keystore_mut(&mut self) -> &mut Keystore {
        &mut self.keystore
    }
}

/// Create a Sui client connected to the specified network
///
/// This function uses the Sui SDK's network-specific builder methods for
/// convenience, or falls back to a custom URL for the `Custom` variant.
///
/// # Arguments
///
/// * `network` - The network to connect to
///
/// # Returns
///
/// Returns a `SuiClient` connected to the specified network, or a `ClientError` if connection fails.
///
/// # Example
///
/// ```rust,no_run
/// use canary_sdk::client::{create_sui_client, Network};
///
/// #[tokio::main]
/// async fn main() -> Result<(), Box<dyn std::error::Error>> {
///     let client = create_sui_client(Network::Devnet).await?;
///     println!("Connected to devnet");
///     Ok(())
/// }
/// ```
pub async fn create_sui_client(network: Network) -> Result<SuiClient, ClientError> {
    let builder = SuiClientBuilder::default();

    let client = match network {
        Network::Localnet => builder
            .build_localnet()
            .await
            .map_err(|e| ClientError::ClientCreation(e.to_string()))?,
        Network::Devnet => builder
            .build_devnet()
            .await
            .map_err(|e| ClientError::ClientCreation(e.to_string()))?,
        Network::Testnet => builder
            .build_testnet()
            .await
            .map_err(|e| ClientError::ClientCreation(e.to_string()))?,
        Network::Mainnet => builder
            .build_mainnet()
            .await
            .map_err(|e| ClientError::ClientCreation(e.to_string()))?,
        Network::Custom(url) => builder
            .build(url)
            .await
            .map_err(|e| ClientError::ClientCreation(e.to_string()))?,
    };

    Ok(client)
}

/// Create a Sui client with a custom URL
///
/// This is a convenience function for creating a client with a custom URL string.
///
/// # Arguments
///
/// * `url` - The RPC URL of the Sui network
///
/// # Returns
///
/// Returns a `SuiClient` connected to the specified URL, or a `ClientError` if connection fails.
///
/// # Example
///
/// ```rust,no_run
/// use canary_sdk::client::create_sui_client_with_url;
///
/// #[tokio::main]
/// async fn main() -> Result<(), Box<dyn std::error::Error>> {
///     let client = create_sui_client_with_url("http://127.0.0.1:9000").await?;
///     println!("Connected to local network");
///     Ok(())
/// }
/// ```
pub async fn create_sui_client_with_url(url: &str) -> Result<SuiClient, ClientError> {
    create_sui_client(Network::Custom(url.to_string())).await
}

/// Create a Sui client with a pre-configured keystore from a Bech32-encoded private key
///
/// This function combines client creation with keystore setup, making it easy to
/// create a client that's ready to sign transactions.
///
/// # Arguments
///
/// * `network` - The network to connect to
/// * `bech32_key` - The Bech32-encoded private key string (from `sui keytool export`)
///
/// # Returns
///
/// Returns a `SuiClientWithSigner` containing the client, signer address, and keystore,
/// or a `ClientError` if the operation fails.
///
/// # Example
///
/// ```rust,no_run
/// use canary_sdk::client::{create_client_with_key, Network};
///
/// #[tokio::main]
/// async fn main() -> Result<(), Box<dyn std::error::Error>> {
///     let bech32_key = "suiprivkey1...";
///     let client_with_signer = create_client_with_key(Network::Devnet, bech32_key).await?;
///     println!("Client ready with signer: {}", client_with_signer.signer());
///     Ok(())
/// }
/// ```
pub async fn create_client_with_key(
    network: Network,
    bech32_key: &str,
) -> Result<SuiClientWithSigner, ClientError> {
    // Create the client
    let client = create_sui_client(network).await?;

    // Create keystore from the private key
    let (keystore, signer) = create_keystore_from_key(bech32_key)
        .await
        .map_err(|e| ClientError::ClientCreation(format!("Failed to load key: {}", e)))?;

    Ok(SuiClientWithSigner {
        client,
        signer,
        keystore,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_network_urls() {
        assert_eq!(Network::Localnet.url(), "http://127.0.0.1:9000");
        assert_eq!(Network::Devnet.url(), "https://fullnode.devnet.sui.io:443");
        assert_eq!(
            Network::Testnet.url(),
            "https://fullnode.testnet.sui.io:443"
        );
        assert_eq!(
            Network::Mainnet.url(),
            "https://fullnode.mainnet.sui.io:443"
        );

        let custom = Network::Custom("http://custom.example.com:9000".to_string());
        assert_eq!(custom.url(), "http://custom.example.com:9000");
    }

    #[test]
    fn test_network_equality() {
        assert_eq!(Network::Localnet, Network::Localnet);
        assert_ne!(Network::Localnet, Network::Devnet);
        assert_eq!(
            Network::Custom("url1".to_string()),
            Network::Custom("url1".to_string())
        );
        assert_ne!(
            Network::Custom("url1".to_string()),
            Network::Custom("url2".to_string())
        );
    }

    #[tokio::test]
    #[ignore] // Ignored by default - requires network connection
    async fn test_create_sui_client_localnet() {
        let result = create_sui_client(Network::Localnet).await;
        // This will fail if localnet is not running, which is expected
        match result {
            Ok(client) => {
                // If it succeeds, verify we can get API version
                let _version = client.api_version();
            }
            Err(_) => {
                // Expected if localnet is not running
            }
        }
    }

    #[tokio::test]
    #[ignore] // Ignored by default - requires network connection
    async fn test_create_sui_client_with_url() {
        let result = create_sui_client_with_url("http://127.0.0.1:9000").await;
        // This will fail if localnet is not running, which is expected
        match result {
            Ok(_) => {}
            Err(_) => {
                // Expected if localnet is not running
            }
        }
    }

    #[tokio::test]
    #[ignore] // Ignored by default - requires network connection and valid key
    async fn test_create_client_with_key() {
        // This test would require a valid Bech32 key and network connection
        // For now, we'll just test that the function exists
        let invalid_key = "invalid_key";
        let result = create_client_with_key(Network::Localnet, invalid_key).await;
        assert!(result.is_err());
    }
}
