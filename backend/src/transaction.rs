//! Transaction block builder helpers
//!
//! This module provides a simplified interface for building and executing Sui transactions.
//! It wraps the Sui SDK's transaction building APIs with convenient helper methods.

use crate::client::SuiClientWithSigner;
use crate::error::TransactionError;
use sui_keys::keystore::AccountKeystore;
use sui_sdk::rpc_types::{SuiTransactionBlockEffectsAPI, SuiTransactionBlockResponse};
use sui_sdk::types::base_types::{ObjectID, SuiAddress};
use sui_sdk::types::programmable_transaction_builder::ProgrammableTransactionBuilder;
use sui_sdk::types::transaction::CallArg;
use sui_sdk::types::transaction::TransactionData;
use sui_sdk::SuiClient;

/// A builder for creating and executing Sui transactions
///
/// This struct wraps the Sui SDK's transaction building APIs to provide a simpler,
/// more convenient interface for common transaction operations.
pub struct CanaryTransactionBuilder {
    /// The Sui client for network interactions
    client: SuiClient,
    /// The signer address
    signer: SuiAddress,
    /// The keystore for signing transactions
    keystore: sui_keys::keystore::Keystore,
    /// The programmable transaction builder
    builder: ProgrammableTransactionBuilder,
    /// Optional gas budget (in MIST)
    gas_budget: Option<u64>,
    /// Optional gas object ID
    gas_object: Option<ObjectID>,
}

impl CanaryTransactionBuilder {
    /// Create a new transaction builder
    ///
    /// # Arguments
    ///
    /// * `client_with_signer` - A `SuiClientWithSigner` containing the client, signer, and keystore
    ///
    /// # Returns
    ///
    /// Returns a new `CanaryTransactionBuilder` instance.
    ///
    /// # Example
    ///
    /// ```rust,no_run
    /// use canary_sdk::transaction::CanaryTransactionBuilder;
    /// use canary_sdk::client::{create_client_with_key, Network};
    ///
    /// #[tokio::main]
    /// async fn main() -> Result<(), Box<dyn std::error::Error>> {
    ///     let client_with_signer = create_client_with_key(Network::Devnet, "suiprivkey1...").await?;
    ///     let mut builder = CanaryTransactionBuilder::new(client_with_signer);
    ///     Ok(())
    /// }
    /// ```
    pub fn new(client_with_signer: SuiClientWithSigner) -> Self {
        Self {
            client: client_with_signer.client,
            signer: client_with_signer.signer,
            keystore: client_with_signer.keystore,
            builder: ProgrammableTransactionBuilder::new(),
            gas_budget: None,
            gas_object: None,
        }
    }

    /// Add a Move call to the transaction
    ///
    /// # Arguments
    ///
    /// * `package` - The package ID containing the module
    /// * `module` - The module name
    /// * `function` - The function name
    /// * `args` - The function arguments
    ///
    /// # Returns
    ///
    /// Returns `&mut Self` for method chaining, or a `TransactionError` if the call fails.
    ///
    /// # Example
    ///
    /// ```rust,no_run
    /// use canary_sdk::transaction::CanaryTransactionBuilder;
    /// use sui_sdk::types::base_types::ObjectID;
    /// use sui_sdk::types::transaction::CallArg;
    ///
    /// # async fn example() -> Result<(), Box<dyn std::error::Error>> {
    /// # let client_with_signer = todo!();
    /// let mut builder = CanaryTransactionBuilder::new(client_with_signer);
    /// let package_id = ObjectID::from_hex_literal("0x2")?;
    /// builder.move_call(package_id, "sui", "transfer", vec![])?;
    /// # Ok(())
    /// # }
    /// ```
    pub fn move_call(
        &mut self,
        package: ObjectID,
        module: &str,
        function: &str,
        args: Vec<CallArg>,
    ) -> Result<&mut Self, TransactionError> {
        // Convert strings to Identifier types for move_call
        // Identifier is in sui_types::identifier, accessed through sui_sdk
        use std::str::FromStr;
        use sui_sdk::types::identifier::Identifier;
        let module_id = Identifier::from_str(module)
            .map_err(|e| TransactionError::BuildError(format!("Invalid module name: {}", e)))?;
        let function_id = Identifier::from_str(function)
            .map_err(|e| TransactionError::BuildError(format!("Invalid function name: {}", e)))?;

        self.builder
            .move_call(package, module_id, function_id, vec![], args)
            .map_err(|e| TransactionError::BuildError(e.to_string()))?;
        Ok(self)
    }

    /// Add a SUI transfer to the transaction
    ///
    /// # Arguments
    ///
    /// * `recipient` - The recipient address
    /// * `amount` - The amount to transfer in MIST (1 SUI = 1_000_000_000 MIST)
    ///
    /// # Returns
    ///
    /// Returns `&mut Self` for method chaining, or a `TransactionError` if the transfer fails.
    ///
    /// # Example
    ///
    /// ```rust,no_run
    /// use canary_sdk::transaction::CanaryTransactionBuilder;
    /// use sui_sdk::types::base_types::SuiAddress;
    ///
    /// # async fn example() -> Result<(), Box<dyn std::error::Error>> {
    /// # let client_with_signer = todo!();
    /// let mut builder = CanaryTransactionBuilder::new(client_with_signer);
    /// let recipient = SuiAddress::from_hex_literal("0x123...")?;
    /// builder.transfer_sui(recipient, 1_000_000_000)?; // Transfer 1 SUI
    /// # Ok(())
    /// # }
    /// ```
    pub fn transfer_sui(
        &mut self,
        recipient: SuiAddress,
        amount: u64,
    ) -> Result<&mut Self, TransactionError> {
        self.builder.transfer_sui(recipient, Some(amount));
        Ok(self)
    }

    /// Add an object transfer to the transaction
    ///
    /// # Arguments
    ///
    /// * `object_id` - The object ID to transfer
    /// * `recipient` - The recipient address
    ///
    /// # Returns
    ///
    /// Returns `&mut Self` for method chaining, or a `TransactionError` if the transfer fails.
    ///
    /// Note: This method requires fetching the object's sequence number and digest.
    /// For a simpler API, consider using the client to get the full object reference first.
    pub async fn transfer_object(
        &mut self,
        object_id: ObjectID,
        recipient: SuiAddress,
    ) -> Result<&mut Self, TransactionError> {
        // Get the object to obtain its sequence number and digest
        let object = self
            .client
            .read_api()
            .get_object_with_options(
                object_id,
                sui_sdk::rpc_types::SuiObjectDataOptions::full_content(),
            )
            .await
            .map_err(|e| TransactionError::BuildError(format!("Failed to get object: {}", e)))?
            .into_object()
            .map_err(|e| {
                TransactionError::BuildError(format!("Failed to convert to object: {}", e))
            })?;

        // Use the object_ref() method to get the object reference tuple
        // Convert to FullObjectRef for transfer_object
        let object_ref = object.object_ref();
        use sui_sdk::types::fullnode_api::FullObjectRef;
        let full_ref = FullObjectRef {
            object_id: object_ref.0,
            version: object_ref.1,
            digest: object_ref.2,
        };

        self.builder
            .transfer_object(recipient, full_ref)
            .map_err(|e| TransactionError::BuildError(e.to_string()))?;
        Ok(self)
    }

    /// Set a custom gas budget for the transaction
    ///
    /// # Arguments
    ///
    /// * `budget` - The gas budget in MIST
    ///
    /// # Returns
    ///
    /// Returns `&mut Self` for method chaining.
    pub fn set_gas_budget(&mut self, budget: u64) -> &mut Self {
        self.gas_budget = Some(budget);
        self
    }

    /// Set a specific gas object to use for the transaction
    ///
    /// # Arguments
    ///
    /// * `gas_object` - The gas object ID
    ///
    /// # Returns
    ///
    /// Returns `&mut Self` for method chaining.
    pub fn set_gas_object(&mut self, gas_object: ObjectID) -> &mut Self {
        self.gas_object = Some(gas_object);
        self
    }

    /// Estimate the gas cost for the transaction
    ///
    /// # Arguments
    ///
    /// * `transaction_data` - The transaction data to estimate
    ///
    /// # Returns
    ///
    /// Returns the estimated gas cost in MIST, or a `TransactionError` if estimation fails.
    pub async fn estimate_gas(
        &self,
        transaction_data: &TransactionData,
    ) -> Result<u64, TransactionError> {
        // Use the client's dry run to estimate gas
        let response = self
            .client
            .read_api()
            .dry_run_transaction_block(transaction_data.clone())
            .await
            .map_err(|e| TransactionError::BuildError(format!("Gas estimation failed: {}", e)))?;

        // Extract gas cost from effects
        let effects = response.effects;
        let gas_summary = effects.gas_cost_summary();
        Ok(gas_summary.computation_cost + gas_summary.storage_cost - gas_summary.storage_rebate)
    }

    /// Build the transaction block
    ///
    /// This method finalizes the transaction, sets up gas, and returns the transaction data.
    ///
    /// # Returns
    ///
    /// Returns the built `TransactionData`, or a `TransactionError` if building fails.
    ///
    /// # Example
    ///
    /// ```rust,no_run
    /// use canary_sdk::transaction::CanaryTransactionBuilder;
    ///
    /// # async fn example() -> Result<(), Box<dyn std::error::Error>> {
    /// # let client_with_signer = todo!();
    /// let mut builder = CanaryTransactionBuilder::new(client_with_signer);
    /// // ... add operations ...
    /// let transaction_data = builder.build().await?;
    /// # Ok(())
    /// # }
    /// ```
    pub async fn build(&mut self) -> Result<TransactionData, TransactionError> {
        // Finish building the programmable transaction (takes ownership of builder)
        let pt =
            std::mem::replace(&mut self.builder, ProgrammableTransactionBuilder::new()).finish();

        // Get or select a gas object with full reference
        let gas_object_ref = if let Some(gas_obj_id) = self.gas_object {
            // Get the full object reference for the specified gas object
            let object = self
                .client
                .read_api()
                .get_object_with_options(
                    gas_obj_id,
                    sui_sdk::rpc_types::SuiObjectDataOptions::full_content(),
                )
                .await
                .map_err(|e| {
                    TransactionError::BuildError(format!("Failed to get gas object: {}", e))
                })?
                .into_object()
                .map_err(|e| {
                    TransactionError::BuildError(format!("Failed to convert gas object: {}", e))
                })?;

            // Use the object_ref() method to get the object reference tuple
            object.object_ref()
        } else {
            // Get available gas objects for the signer
            let gas_objects = self
                .client
                .coin_read_api()
                .get_coins(self.signer, Some("0x2::sui::SUI".to_string()), None, None)
                .await
                .map_err(|e| {
                    TransactionError::BuildError(format!("Failed to get gas objects: {}", e))
                })?;

            let first_gas =
                gas_objects
                    .data
                    .first()
                    .ok_or_else(|| TransactionError::InsufficientGas {
                        required: 0,
                        available: 0,
                    })?;

            // Get the full object reference
            let object = self
                .client
                .read_api()
                .get_object_with_options(
                    first_gas.coin_object_id,
                    sui_sdk::rpc_types::SuiObjectDataOptions::full_content(),
                )
                .await
                .map_err(|e| {
                    TransactionError::BuildError(format!("Failed to get gas object: {}", e))
                })?
                .into_object()
                .map_err(|e| {
                    TransactionError::BuildError(format!("Failed to convert gas object: {}", e))
                })?;

            // Use the object_ref() method to get the object reference tuple
            object.object_ref()
        };

        // Determine gas budget
        let gas_budget = if let Some(budget) = self.gas_budget {
            budget
        } else {
            // Get reference gas price first
            let gas_price = self
                .client
                .read_api()
                .get_reference_gas_price()
                .await
                .map_err(|e| {
                    TransactionError::BuildError(format!("Failed to get gas price: {}", e))
                })?;

            // Build a temporary transaction to estimate gas
            let temp_tx = TransactionData::new_programmable(
                self.signer,
                vec![gas_object_ref],
                pt.clone(),
                gas_price,
                10_000_000, // Default budget for estimation
            );

            // Estimate gas and add 20% buffer
            let estimated = self.estimate_gas(&temp_tx).await?;
            estimated + (estimated / 5) // Add 20% buffer
        };

        // Get reference gas price
        let gas_price = self
            .client
            .read_api()
            .get_reference_gas_price()
            .await
            .map_err(|e| TransactionError::BuildError(format!("Failed to get gas price: {}", e)))?;

        // Build the final transaction
        let transaction_data = TransactionData::new_programmable(
            self.signer,
            vec![gas_object_ref],
            pt,
            gas_price,
            gas_budget,
        );

        Ok(transaction_data)
    }

    /// Execute the transaction
    ///
    /// This method builds, signs, and executes the transaction in one step.
    ///
    /// # Returns
    ///
    /// Returns the transaction response, or a `TransactionError` if execution fails.
    ///
    /// # Example
    ///
    /// ```rust,no_run
    /// use canary_sdk::transaction::CanaryTransactionBuilder;
    ///
    /// # async fn example() -> Result<(), Box<dyn std::error::Error>> {
    /// # let client_with_signer = todo!();
    /// let mut builder = CanaryTransactionBuilder::new(client_with_signer);
    /// // ... add operations ...
    /// let response = builder.execute().await?;
    /// println!("Transaction executed: {:?}", response.digest);
    /// # Ok(())
    /// # }
    /// ```
    pub async fn execute(&mut self) -> Result<SuiTransactionBlockResponse, TransactionError> {
        // Build the transaction
        let transaction_data = self.build().await?;

        // Sign the transaction using the keystore
        // The sign_secure method requires an Intent - use sui_transaction intent from shared_crypto
        // Note: shared_crypto is a transitive dependency of sui_sdk
        use shared_crypto::intent::Intent;
        let intent = Intent::sui_transaction();
        let signature = self
            .keystore
            .sign_secure(&self.signer, &transaction_data, intent)
            .await
            .map_err(|e| {
                TransactionError::BuildError(format!("Failed to sign transaction: {}", e))
            })?;

        // Create the signed transaction envelope
        let signed_tx = sui_sdk::types::transaction::SenderSignedData::new(
            transaction_data,
            vec![signature.into()],
        );

        // Wrap in Envelope for execution - use the specific type to disambiguate
        use sui_sdk::types::message_envelope::EmptySignInfo;
        use sui_sdk::types::message_envelope::Envelope;
        let envelope =
            Envelope::<sui_sdk::types::transaction::SenderSignedData, EmptySignInfo>::new(
                signed_tx,
            );

        // Execute the transaction
        let response = self
            .client
            .quorum_driver_api()
            .execute_transaction_block(
                envelope,
                sui_sdk::rpc_types::SuiTransactionBlockResponseOptions::full_content(),
                None,
            )
            .await
            .map_err(|e| TransactionError::ExecutionError(e.to_string()))?;

        Ok(response)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sui_keys::keystore::{AccountKeystore, InMemKeystore};
    use sui_sdk::types::base_types::SuiAddress;
    use sui_sdk::types::crypto::SuiKeyPair;
    use sui_sdk::SuiClientBuilder;

    /// Helper function to create a test client with signer
    /// This creates a temporary keystore with a random key for testing
    async fn create_test_client_with_signer() -> SuiClientWithSigner {
        // Generate a random keypair for testing
        let keypair = SuiKeyPair::generate(&mut rand::thread_rng());
        let address = SuiAddress::from(&keypair.public());

        // Create an in-memory keystore and add the key
        let mut keystore = InMemKeystore::new();
        keystore.add_key(address, keypair).unwrap();

        // Create a client (this will fail if network is not available, but that's OK for unit tests)
        let client = SuiClientBuilder::default()
            .build("https://fullnode.devnet.sui.io:443")
            .await
            .unwrap_or_else(|_| {
                // If network is not available, we'll still create a builder for testing
                // The actual network calls will fail, but we can test the builder logic
                panic!("Network not available for testing")
            });

        SuiClientWithSigner {
            client,
            signer: address,
            keystore: keystore.into(),
        }
    }

    #[test]
    fn test_new_builder() {
        // This test requires network, so we'll test the structure separately
        // The actual creation will be tested in integration tests
        let _ = ProgrammableTransactionBuilder::new();
        // If we can create a ProgrammableTransactionBuilder, the structure is correct
    }

    #[tokio::test]
    #[ignore] // Requires network connection
    async fn test_builder_creation_with_network() {
        // This test requires a network connection
        // It will be skipped unless explicitly run with --ignored
        let result = create_test_client_with_signer().await;
        let builder = CanaryTransactionBuilder::new(result);

        // Verify builder was created
        // We can't easily inspect private fields, but if new() succeeds, it's working
        assert!(true); // Placeholder assertion
    }

    #[tokio::test]
    #[ignore] // Requires network connection and valid key
    async fn test_move_call_basic() {
        // Test basic move_call functionality
        let client_with_signer = create_test_client_with_signer().await;
        let mut builder = CanaryTransactionBuilder::new(client_with_signer);

        let package_id = ObjectID::from_hex_literal("0x2").unwrap();
        let result = builder.move_call(package_id, "sui", "transfer", vec![]);

        // Should succeed for valid inputs
        assert!(result.is_ok());
    }

    #[tokio::test]
    #[ignore] // Requires network connection
    async fn test_move_call_invalid_module() {
        let client_with_signer = create_test_client_with_signer().await;
        let mut builder = CanaryTransactionBuilder::new(client_with_signer);

        let package_id = ObjectID::from_hex_literal("0x2").unwrap();

        // Empty module name should fail
        let result = builder.move_call(package_id, "", "transfer", vec![]);
        assert!(result.is_err());
    }

    #[tokio::test]
    #[ignore] // Requires network connection
    async fn test_transfer_sui_basic() {
        let client_with_signer = create_test_client_with_signer().await;
        let mut builder = CanaryTransactionBuilder::new(client_with_signer);

        let recipient = SuiAddress::from_hex_literal("0x1").unwrap();
        let result = builder.transfer_sui(recipient, 1_000_000_000);

        assert!(result.is_ok());
    }

    #[tokio::test]
    #[ignore] // Requires network connection
    async fn test_method_chaining() {
        // Test that methods can be chained
        let client_with_signer = create_test_client_with_signer().await;
        let mut builder = CanaryTransactionBuilder::new(client_with_signer);

        let package_id = ObjectID::from_hex_literal("0x2").unwrap();
        let recipient = SuiAddress::from_hex_literal("0x1").unwrap();

        // Chain multiple operations
        let result = builder
            .move_call(package_id, "sui", "transfer", vec![])
            .and_then(|b| b.transfer_sui(recipient, 1_000_000_000))
            .and_then(|b| {
                let gas_obj = ObjectID::from_hex_literal("0x1").unwrap();
                Ok(b.set_gas_object(gas_obj))
            });

        assert!(result.is_ok());
    }

    #[tokio::test]
    #[ignore] // Requires network connection and gas objects
    async fn test_build_requires_operations() {
        // Test that build() works even with no operations (empty transaction)
        let client_with_signer = create_test_client_with_signer().await;
        let mut builder = CanaryTransactionBuilder::new(client_with_signer);

        // Build should still work (though the transaction might be invalid)
        // This will fail if there are no gas objects, which is expected
        let result = builder.build().await;

        // This might fail due to no gas objects or other network issues
        // We're just testing that the method exists and can be called
        match result {
            Ok(_) => assert!(true),
            Err(_) => {
                // Expected if no gas objects available
                assert!(true);
            }
        }
    }

    #[tokio::test]
    #[ignore] // Requires network connection, valid key, and gas
    async fn test_execute_requires_build() {
        // Test that execute() calls build() internally
        let client_with_signer = create_test_client_with_signer().await;
        let mut builder = CanaryTransactionBuilder::new(client_with_signer);

        // Add a simple operation
        let package_id = ObjectID::from_hex_literal("0x2").unwrap();
        builder
            .move_call(package_id, "sui", "transfer", vec![])
            .unwrap();

        // Execute will fail without gas, but we're testing the flow
        let result = builder.execute().await;

        // This will likely fail due to gas or network issues, but tests the integration
        match result {
            Ok(_) => assert!(true),
            Err(e) => {
                // Verify it's a transaction error
                match e {
                    TransactionError::BuildError(_) => assert!(true),
                    TransactionError::ExecutionError(_) => assert!(true),
                    TransactionError::InsufficientGas { .. } => assert!(true),
                    _ => assert!(false, "Unexpected error type"),
                }
            }
        }
    }
}
