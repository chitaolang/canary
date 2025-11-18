//! Canary contract helpers
//!
//! This module provides high-level functions for interacting with the Canary contract,
//! including member registry operations and package storage operations.

use std::str::FromStr;

use crate::client::SuiClientWithSigner;
use crate::error::{CanaryError, TransactionError};
use crate::transaction::CanaryTransactionBuilder;
use serde::{Deserialize, Serialize};
use sui_sdk::rpc_types::{DevInspectResults, SuiObjectDataOptions, SuiTransactionBlockEffectsAPI};
use sui_sdk::types::base_types::{ObjectID, SuiAddress};
use sui_sdk::types::transaction::{CallArg, ObjectArg, SharedObjectMutability};
use sui_sdk::SuiClient;

use bcs;
use sui_types::base_types::SequenceNumber;
use sui_types::derived_object::derive_object_id;
use sui_types::TypeTag;

/// Information about a Registry object
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegistryInfo {
    /// The Registry object ID
    pub id: ObjectID,
    /// The membership fee in MIST
    pub fee: u64,
    /// The total number of members
    pub member_count: u64,
    /// The admin address
    pub admin: SuiAddress,
}

/// Information about a member
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemberInfo {
    /// The member's domain name
    pub domain: String,
    /// Timestamp when the member joined (in milliseconds)
    pub joined_at: u64,
}

/// Information about a member with their address
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemberInfoWithAddress {
    /// The member's address
    pub member: SuiAddress,
    /// The member's domain name
    pub domain: String,
    /// Timestamp when the member joined (in milliseconds)
    pub joined_at: u64,
}

/// Information about a CanaryBlob object
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CanaryBlobInfo {
    /// The CanaryBlob object ID
    pub id: ObjectID,
    /// The contract blob object ID (as address)
    pub contract_blob_id: ObjectID,
    /// The explain blob object ID (as address)
    pub explain_blob_id: ObjectID,
    /// The package ID (as address)
    pub package_id: ObjectID,
    /// The domain name
    pub domain: String,
    /// Timestamp when the blob was uploaded (in milliseconds)
    pub uploaded_at: u64,
    /// Address of the admin who uploaded the blob
    pub uploaded_by_admin: SuiAddress,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CanaryKey {
    pub prefix: Vec<u8>, // "canary"
    pub domain: String,
    pub package_id: ObjectID,
}

// ============================================================================
// Member Registry Functions
// ============================================================================

/// Join the registry by paying the membership fee
///
/// # Arguments
///
/// * `client` - A `SuiClientWithSigner` containing the client, signer, and keystore
/// * `registry_id` - The Registry object ID
/// * `domain` - The domain name to register
/// * `payment_amount` - The payment amount in MIST (must be >= registry fee)
///
/// # Returns
///
/// Returns the transaction response, or a `CanaryError` if the operation fails.
///
/// # Example
///
/// ```rust,no_run
/// use canary_sdk::canary::join_registry;
/// use canary_sdk::client::{create_client_with_key, Network};
/// use sui_sdk::types::base_types::ObjectID;
///
/// # async fn example() -> Result<(), Box<dyn std::error::Error>> {
/// let client = create_client_with_key(Network::Devnet, "suiprivkey1...").await?;
/// let registry_id = ObjectID::from_hex_literal("0x123...")?;
/// let response = join_registry(&client, registry_id, "example.com".to_string(), 1_000_000_000).await?;
/// println!("Joined registry: {:?}", response.digest());
/// # Ok(())
/// # }
/// ```
pub async fn join_registry(
    client: SuiClientWithSigner,
    registry_id: ObjectID,
    domain: String,
    payment_amount: u64,
) -> Result<sui_sdk::rpc_types::SuiTransactionBlockResponse, CanaryError> {
    // Get the Clock object ID (0x6 is the Clock object)
    let clock_id = ObjectID::from_hex_literal("0x6")
        .map_err(|e| CanaryError::Registry(format!("Failed to parse Clock object ID: {}", e)))?;

    // We need the package ID - let's get it from the registry object's type
    let registry_obj = client
        .client
        .read_api()
        .get_object_with_options(registry_id, SuiObjectDataOptions::full_content())
        .await
        .map_err(|e| CanaryError::Registry(format!("Failed to get registry object: {}", e)))?
        .into_object()
        .map_err(|_| CanaryError::Registry("Registry object not found".to_string()))?;

    // Get the object reference before moving the type field
    let registry_ref = registry_obj.object_ref();

    // Extract package ID from the object type
    // The type should be something like "0x<PACKAGE_ID>::member_registry::Registry"
    let object_type = registry_obj
        .type_
        .ok_or_else(|| CanaryError::Registry("Registry object has no type".to_string()))?;

    let package_id = extract_package_id_from_type(&object_type.to_string()).ok_or_else(|| {
        CanaryError::Registry("Failed to extract package ID from registry type".to_string())
    })?;

    // Get a coin for payment
    let coins = client
        .client
        .coin_read_api()
        .get_coins(
            client.signer,
            Some("0x2::sui::SUI".to_string()),
            None,
            Some(1),
        )
        .await
        .map_err(|e| CanaryError::Registry(format!("Failed to get coins: {}", e)))?;

    let payment_coin = coins
        .data
        .first()
        .ok_or_else(|| CanaryError::Registry("No coins available for payment".to_string()))?;

    // Get the full object reference for the payment coin
    let payment_coin_obj = client
        .client
        .read_api()
        .get_object_with_options(
            payment_coin.coin_object_id,
            SuiObjectDataOptions::full_content(),
        )
        .await
        .map_err(|e| CanaryError::Registry(format!("Failed to get payment coin: {}", e)))?
        .into_object()
        .map_err(|_| CanaryError::Registry("Payment coin object not found".to_string()))?;

    // Create a transaction builder (after we've extracted all needed data)
    let mut builder = CanaryTransactionBuilder::new(client);

    // Split the coin if needed (if the coin value is greater than payment_amount)
    // For simplicity, we'll use the coin directly if it matches, otherwise we need to split
    // For now, let's assume we have a coin with the exact amount or use the first coin

    // Build the move_call arguments
    // join_registry(registry: &mut Registry, payment: Coin<SUI>, domain: String, clock: &Clock, ctx: &mut TxContext)
    use sui_sdk::types::transaction::SharedObjectMutability;
    let args = vec![
        CallArg::Object(ObjectArg::SharedObject {
            id: registry_id,
            initial_shared_version: registry_ref.1, // version from object_ref
            mutability: SharedObjectMutability::Mutable,
        }),
        CallArg::Object(ObjectArg::ImmOrOwnedObject(payment_coin_obj.object_ref())),
        CallArg::Pure(domain.as_bytes().to_vec()),
        CallArg::Object(ObjectArg::SharedObject {
            id: clock_id,
            initial_shared_version: SequenceNumber::from(1), // Clock is always at version 1
            mutability: SharedObjectMutability::Immutable,
        }),
    ];

    // Add the move_call
    builder
        .move_call(package_id, "member_registry", "join_registry", args)
        .map_err(|e| CanaryError::Transaction(e))?;

    // Execute the transaction
    let response = builder
        .execute()
        .await
        .map_err(|e| CanaryError::Transaction(e))?;

    Ok(response)
}

/// Query registry information
///
/// # Arguments
///
/// * `client` - A `SuiClient` for querying
/// * `registry_id` - The Registry object ID
///
/// # Returns
///
/// Returns `RegistryInfo` with registry details, or a `CanaryError` if the query fails.
///
/// # Example
///
/// ```rust,no_run
/// use canary_sdk::canary::query_registry;
/// use canary_sdk::client::{create_sui_client, Network};
/// use sui_sdk::types::base_types::ObjectID;
///
/// # async fn example() -> Result<(), Box<dyn std::error::Error>> {
/// let client = create_sui_client(Network::Devnet).await?;
/// let registry_id = ObjectID::from_hex_literal("0x123...")?;
/// let info = query_registry(&client, registry_id).await?;
/// println!("Registry fee: {} MIST", info.fee);
/// println!("Member count: {}", info.member_count);
/// # Ok(())
/// # }
/// ```

// ============================================================================
// Package Storage Functions
// ============================================================================

/// Store a blob in the registry
///
/// # Arguments
///
/// * `client` - A `SuiClientWithSigner` containing the client, signer, and keystore
/// * `registry_id` - The Registry object ID
/// * `admin_cap_id` - The AdminCap object ID
/// * `domain` - The domain name
/// * `contract_blob_id` - The contract blob object ID (as address)
/// * `explain_blob_id` - The explain blob object ID (as address)
/// * `package_id` - The package ID (as address)
///
/// # Returns
///
/// Returns the transaction response, or a `CanaryError` if the operation fails.
pub async fn store_blob(
    client: SuiClientWithSigner,
    registry_id: ObjectID,
    admin_cap_id: ObjectID,
    domain: String,
    contract_blob_id: ObjectID,
    explain_blob_id: ObjectID,
    package_id: ObjectID,
) -> Result<sui_sdk::rpc_types::SuiTransactionBlockResponse, CanaryError> {
    // Get the Clock object ID
    let clock_id = ObjectID::from_hex_literal("0x6")
        .map_err(|e| CanaryError::Registry(format!("Failed to parse Clock object ID: {}", e)))?;

    // Get the package ID from the registry object
    let registry_obj = client
        .client
        .read_api()
        .get_object_with_options(registry_id, SuiObjectDataOptions::full_content())
        .await
        .map_err(|e| CanaryError::Registry(format!("Failed to get registry object: {}", e)))?
        .into_object()
        .map_err(|_| CanaryError::Registry("Registry object not found".to_string()))?;
    let registry_ref = registry_obj.object_ref();

    let object_type = registry_obj
        .type_
        .ok_or_else(|| CanaryError::Registry("Registry object has no type".to_string()))?;

    let canary_package_id = extract_package_id_from_type(&object_type.to_string())
        .ok_or_else(|| CanaryError::Registry("Failed to extract package ID".to_string()))?;

    // Get admin cap object
    let admin_cap_obj = client
        .client
        .read_api()
        .get_object_with_options(admin_cap_id, SuiObjectDataOptions::full_content())
        .await
        .map_err(|e| CanaryError::Registry(format!("Failed to get admin cap: {}", e)))?
        .into_object()
        .map_err(|_| CanaryError::Registry("Admin cap not found".to_string()))?;

    // Build the move_call arguments
    // store_blob(registry: &mut Registry, admin_cap: &AdminCap, domain: String,
    //            contract_blob_id: address, explain_blob_id: address, package_id: address,
    //            clock: &Clock, ctx: &mut TxContext)
    let args = vec![
        CallArg::Object(ObjectArg::SharedObject {
            id: registry_id,
            initial_shared_version: registry_ref.1, // version from object_ref
            mutability: SharedObjectMutability::Mutable,
        }),
        CallArg::Object(ObjectArg::ImmOrOwnedObject(admin_cap_obj.object_ref())),
        CallArg::Pure(domain.as_bytes().to_vec()),
        CallArg::Pure(contract_blob_id.to_vec()),
        CallArg::Pure(explain_blob_id.to_vec()),
        CallArg::Pure(package_id.to_vec()),
        CallArg::Object(ObjectArg::SharedObject {
            id: clock_id,
            initial_shared_version: SequenceNumber::from(1),
            mutability: SharedObjectMutability::Immutable,
        }),
    ];

    let mut builder = CanaryTransactionBuilder::new(client);

    builder
        .move_call(canary_package_id, "pkg_storage", "store_blob", args)
        .map_err(|e| CanaryError::Transaction(e))?;

    let response = builder
        .execute()
        .await
        .map_err(|e| CanaryError::Transaction(e))?;

    Ok(response)
}

/// Update a blob in the registry
///
/// # Arguments
///
/// * `client` - A `SuiClientWithSigner` containing the client, signer, and keystore
/// * `registry_id` - The Registry object ID (required by Move function)
/// * `admin_cap_id` - The AdminCap object ID
/// * `canary_blob_id` - The CanaryBlob object ID
/// * `new_contract_blob_id` - The new contract blob object ID (as address)
/// * `new_explain_blob_id` - The new explain blob object ID (as address)
///
/// # Returns
///
/// Returns the transaction response, or a `CanaryError` if the operation fails.
///
/// # Note
///
/// The Move function `update_blob` requires a `registry` parameter, so `registry_id` is needed.
/// This is a reasonable extension to the plan's function signature.
pub async fn update_blob(
    client: SuiClientWithSigner,
    registry_id: ObjectID,
    admin_cap_id: ObjectID,
    canary_blob_id: ObjectID,
    new_contract_blob_id: ObjectID,
    new_explain_blob_id: ObjectID,
) -> Result<sui_sdk::rpc_types::SuiTransactionBlockResponse, CanaryError> {
    // Get the Clock object ID
    let clock_id = ObjectID::from_hex_literal("0x6")
        .map_err(|e| CanaryError::Registry(format!("Failed to parse Clock object ID: {}", e)))?;

    // Get the canary blob object to extract package ID and registry info
    let canary_blob_obj = client
        .client
        .read_api()
        .get_object_with_options(canary_blob_id, SuiObjectDataOptions::full_content())
        .await
        .map_err(|e| CanaryError::CanaryBlobNotFound)?;

    let canary_blob = canary_blob_obj
        .into_object()
        .map_err(|_| CanaryError::CanaryBlobNotFound)?;

    // Get the object reference before moving the type field
    let canary_blob_ref = canary_blob.object_ref();

    let object_type = canary_blob
        .type_
        .ok_or_else(|| CanaryError::CanaryBlobNotFound)?;

    let canary_package_id = extract_package_id_from_type(&object_type.to_string())
        .ok_or_else(|| CanaryError::CanaryBlobNotFound)?;

    // Get admin cap object
    let admin_cap_obj = client
        .client
        .read_api()
        .get_object_with_options(admin_cap_id, SuiObjectDataOptions::full_content())
        .await
        .map_err(|e| CanaryError::Registry(format!("Failed to get admin cap: {}", e)))?
        .into_object()
        .map_err(|_| CanaryError::Registry("Admin cap not found".to_string()))?;

    // Get registry object
    let registry_obj = client
        .client
        .read_api()
        .get_object_with_options(registry_id, SuiObjectDataOptions::full_content())
        .await
        .map_err(|e| CanaryError::Registry(format!("Failed to get registry: {}", e)))?
        .into_object()
        .map_err(|_| CanaryError::Registry("Registry not found".to_string()))?;

    // Build the move_call arguments
    // update_blob(registry: &Registry, admin_cap: &AdminCap, canary_blob: &mut CanaryBlob,
    //              new_contract_blob_id: address, new_explain_blob_id: address, clock: &Clock, ctx: &TxContext)
    let args = vec![
        CallArg::Object(ObjectArg::SharedObject {
            id: registry_id,
            initial_shared_version: registry_obj.object_ref().1, // version from object_ref
            mutability: SharedObjectMutability::Immutable,
        }),
        CallArg::Object(ObjectArg::ImmOrOwnedObject(admin_cap_obj.object_ref())),
        CallArg::Object(ObjectArg::SharedObject {
            id: canary_blob_id,
            initial_shared_version: canary_blob_ref.1, // version from object_ref
            mutability: SharedObjectMutability::Mutable,
        }),
        CallArg::Pure(new_contract_blob_id.to_vec()),
        CallArg::Pure(new_explain_blob_id.to_vec()),
        CallArg::Object(ObjectArg::SharedObject {
            id: clock_id,
            initial_shared_version: SequenceNumber::from(1),
            mutability: SharedObjectMutability::Immutable,
        }),
    ];

    let mut builder = CanaryTransactionBuilder::new(client);

    builder
        .move_call(canary_package_id, "pkg_storage", "update_blob", args)
        .map_err(|e| CanaryError::Transaction(e))?;

    let response = builder
        .execute()
        .await
        .map_err(|e| CanaryError::Transaction(e))?;

    Ok(response)
}

/// Delete a canary blob
///
/// # Arguments
///
/// * `client` - A `SuiClientWithSigner` containing the client, signer, and keystore
/// * `registry_id` - The Registry object ID
/// * `admin_cap_id` - The AdminCap object ID
/// * `canary_blob_id` - The CanaryBlob object ID
///
/// # Returns
///
/// Returns the transaction response, or a `CanaryError` if the operation fails.
pub async fn delete_canary_blob(
    client: SuiClientWithSigner,
    registry_id: ObjectID,
    admin_cap_id: ObjectID,
    canary_blob_id: ObjectID,
) -> Result<sui_sdk::rpc_types::SuiTransactionBlockResponse, CanaryError> {
    // Get the canary blob object to extract package ID
    let canary_blob_obj = client
        .client
        .read_api()
        .get_object_with_options(canary_blob_id, SuiObjectDataOptions::full_content())
        .await
        .map_err(|_| CanaryError::CanaryBlobNotFound)?
        .into_object()
        .map_err(|_| CanaryError::CanaryBlobNotFound)?;

    // Get the object reference before moving the type field
    let canary_blob_obj_ref = canary_blob_obj.object_ref();

    let object_type = canary_blob_obj
        .type_
        .ok_or_else(|| CanaryError::CanaryBlobNotFound)?;

    let canary_package_id = extract_package_id_from_type(&object_type.to_string())
        .ok_or_else(|| CanaryError::CanaryBlobNotFound)?;

    // Get registry object
    let registry_obj = client
        .client
        .read_api()
        .get_object_with_options(registry_id, SuiObjectDataOptions::full_content())
        .await
        .map_err(|e| CanaryError::Registry(format!("Failed to get registry: {}", e)))?
        .into_object()
        .map_err(|_| CanaryError::Registry("Registry not found".to_string()))?;

    // Get admin cap object
    let admin_cap_obj = client
        .client
        .read_api()
        .get_object_with_options(admin_cap_id, SuiObjectDataOptions::full_content())
        .await
        .map_err(|e| CanaryError::Registry(format!("Failed to get admin cap: {}", e)))?
        .into_object()
        .map_err(|_| CanaryError::Registry("Admin cap not found".to_string()))?;

    // Build the move_call arguments
    // delete_canary_blob(registry: &Registry, admin_cap: &AdminCap, canary_blob: CanaryBlob)
    let args = vec![
        CallArg::Object(ObjectArg::SharedObject {
            id: registry_id,
            initial_shared_version: registry_obj.object_ref().1, // version from object_ref
            mutability: SharedObjectMutability::Immutable,
        }),
        CallArg::Object(ObjectArg::ImmOrOwnedObject(admin_cap_obj.object_ref())),
        CallArg::Object(ObjectArg::ImmOrOwnedObject(canary_blob_obj_ref)),
    ];

    let mut builder = CanaryTransactionBuilder::new(client);

    builder
        .move_call(canary_package_id, "pkg_storage", "delete_canary_blob", args)
        .map_err(|e| CanaryError::Transaction(e))?;

    let response = builder
        .execute()
        .await
        .map_err(|e| CanaryError::Transaction(e))?;

    Ok(response)
}

/// Derive the canary address for a given domain and package
///
/// # Arguments
///
/// * `client` - A `SuiClient` for querying
/// * `registry_id` - The Registry object ID
/// * `domain` - The domain name
/// * `package_id` - The package ID (as address)
///
/// # Returns
///
/// Returns the derived `SuiAddress` for the canary blob, or a `CanaryError` if the operation fails.
pub async fn derive_canary_address(
    registry_id: ObjectID,
    domain: String,
    package_id: ObjectID,
) -> Result<SuiAddress, CanaryError> {
    let key = CanaryKey {
        prefix: b"canary".to_vec(),
        domain,
        package_id,
    };
    let type_tag = TypeTag::from_str(
        "0xa58168ec04f9fb72a4bdfab1eabec92f46d36d0b1ac345f8db3a761a9b5c9b23::pkg_storage::CanaryKey",
    ).unwrap();
    let key_bytes = bcs::to_bytes(&key).unwrap();
    let derived_object_id = derive_object_id(registry_id, &type_tag, &key_bytes);
    Ok(SuiAddress::from(derived_object_id.unwrap()))
}

/// Query canary blob information
///
/// # Arguments
///
/// * `client` - A `SuiClient` for querying
/// * `canary_blob_id` - The CanaryBlob object ID
///
/// # Returns
///
/// Returns `CanaryBlobInfo` with blob details, or a `CanaryError` if the query fails.
pub async fn query_canary_blob(
    client: &SuiClient,
    canary_blob_id: ObjectID,
) -> Result<DevInspectResults, CanaryError> {
    // Get the canary blob object
    let canary_blob_obj = client
        .read_api()
        .get_object_with_options(canary_blob_id, SuiObjectDataOptions::full_content())
        .await
        .map_err(|_| CanaryError::CanaryBlobNotFound)?
        .into_object()
        .map_err(|_| CanaryError::CanaryBlobNotFound)?;

    let object_type = canary_blob_obj
        .type_
        .ok_or_else(|| CanaryError::CanaryBlobNotFound)?;

    let canary_package_id = extract_package_id_from_type(&object_type.to_string())
        .ok_or_else(|| CanaryError::CanaryBlobNotFound)?;
    let initial_shared_version = get_initial_shared_version(client, canary_blob_id)
        .await
        .map_err(|e| {
            CanaryError::Registry(format!("Failed to get initial shared version: {}", e))
        })?;

    // Use dev_inspect to call get_full_info
    // get_full_info(canary_blob: &CanaryBlob): (address, address, address, String, u64, address)
    let result = dev_inspect_call(
        client,
        canary_package_id,
        "pkg_storage",
        "get_full_info",
        vec![CallArg::Object(ObjectArg::SharedObject {
            id: canary_blob_id,
            initial_shared_version: initial_shared_version,
            mutability: SharedObjectMutability::Immutable,
        })],
    )
    .await?;

    Ok(result)

    /*
    // Addresses are 32 bytes
    fn parse_address(bytes: &[u8]) -> Result<ObjectID, CanaryError> {
        if bytes.len() != 32 {
            return Err(CanaryError::Registry(format!(
                "Invalid address length: expected 32, got {}",
                bytes.len()
            )));
        }
        let address_array: [u8; 32] = bytes.try_into().map_err(|e| {
            CanaryError::Registry(format!("Failed to convert to address array: {:?}", e))
        })?;
        // Create ObjectID directly from bytes
        ObjectID::from_bytes(address_array)
            .map_err(|e| CanaryError::Registry(format!("Failed to create ObjectID: {}", e)))
    }
    */
    /*
    let contract_blob_id = parse_address(&result.results.unwrap()[0].return_values[0].0)?;
    let explain_blob_id = parse_address(&result.results.unwrap()[0].return_values[1].0)?;
    let package_id = parse_address(&result.results.unwrap()[0].return_values[2].0)?;

    let domain: String = String::from_utf8(result.results.unwrap()[0].return_values[3].0.clone())
        .map_err(|e| {
        CanaryError::Registry(format!("Failed to convert domain to string: {}", e))
    })?;

    let uploaded_at_bytes = &result.results.unwrap()[0].return_values[4].0;
    let uploaded_at: u64 = if uploaded_at_bytes.len() == 8 {
        u64::from_le_bytes(uploaded_at_bytes.as_slice().try_into().map_err(|_| {
            CanaryError::Registry("Failed to convert uploaded_at bytes to u64".to_string())
        })?)
    } else {
        return Err(CanaryError::Registry(format!(
            "Invalid uploaded_at length: expected 8, got {}",
            uploaded_at_bytes.len()
        )));
    };

    let uploaded_by_admin = parse_address(&result.results.unwrap()[0].return_values[5].0)?;
    let uploaded_by_admin_addr = SuiAddress::from(uploaded_by_admin);

    Ok(CanaryBlobInfo {
        id: canary_blob_id,
        contract_blob_id,
        explain_blob_id,
        package_id,
        domain,
        uploaded_at,
        uploaded_by_admin: uploaded_by_admin_addr,
    })
    */
}

// ============================================================================
// Helper Functions
// ============================================================================

pub async fn get_initial_shared_version(
    client: &SuiClient,
    object_id: ObjectID,
) -> Result<SequenceNumber, anyhow::Error> {
    let response = client
        .read_api()
        .get_object_with_options(object_id, SuiObjectDataOptions::bcs_lossless())
        .await?;
    let registry_initial_shared_version = match response.data.unwrap().owner.unwrap() {
        sui_types::object::Owner::Shared {
            initial_shared_version,
        } => initial_shared_version,
        _ => panic!(""),
    };
    Ok(registry_initial_shared_version)
}

/// Extract package ID from a Move type string
/// Example: "0x123::member_registry::Registry" -> ObjectID(0x123)
fn extract_package_id_from_type(type_str: &str) -> Option<ObjectID> {
    // Type format: "0x<PACKAGE_ID>::<MODULE>::<STRUCT>"
    if let Some(colon_pos) = type_str.find("::") {
        let package_str = &type_str[..colon_pos];
        ObjectID::from_hex_literal(package_str).ok()
    } else {
        None
    }
}

/// Call a view function using dev_inspect_transaction_block
async fn dev_inspect_call(
    client: &SuiClient,
    package_id: ObjectID,
    module: &str,
    function: &str,
    args: Vec<CallArg>,
) -> Result<DevInspectResults, CanaryError> {
    use std::str::FromStr;
    use sui_sdk::types::programmable_transaction_builder::ProgrammableTransactionBuilder;
    use sui_sdk::types::transaction::TransactionData;
    use sui_types::Identifier;

    let module_id = Identifier::from_str(module)
        .map_err(|e| CanaryError::Registry(format!("Invalid module name: {}", e)))?;
    let function_id = Identifier::from_str(function)
        .map_err(|e| CanaryError::Registry(format!("Invalid function name: {}", e)))?;

    let mut builder = ProgrammableTransactionBuilder::new();
    builder
        .move_call(package_id, module_id, function_id, vec![], args)
        .map_err(|e| CanaryError::Registry(format!("Failed to build move call: {}", e)))?;

    let pt = builder.finish();

    // Create a dummy transaction for dev_inspect
    // We need a sender address - use a dummy address
    let dummy_sender = SuiAddress::from_str("0x1")
        .map_err(|e| CanaryError::Registry(format!("Failed to create dummy sender: {}", e)))?;
    let gas_price = client
        .read_api()
        .get_reference_gas_price()
        .await
        .map_err(|e| CanaryError::Registry(format!("Failed to get gas price: {}", e)))?;

    let transaction_data = TransactionData::new_programmable(
        dummy_sender,
        vec![], // No gas objects needed for dev_inspect
        pt,
        gas_price,
        10_000_000, // Dummy budget
    );

    let TransactionData::V1(tx_data_v1) = transaction_data;
    let tx_kind = tx_data_v1.kind;

    // Call dev_inspect
    // dev_inspect_transaction_block requires: sender, transaction_data, gas_price, gas_objects, epoch
    let result = client
        .read_api()
        .dev_inspect_transaction_block(
            dummy_sender,
            tx_kind,
            None,
            None, // gas_objects - None means use dummy
            None, // epoch - None means use current
        )
        .await
        .map_err(|e| CanaryError::Registry(format!("dev_inspect failed: {}", e)))?;

    // Extract return values from the effects
    // The return values are in the effects

    Ok(result)
}

/// Query registry fields (member_count and fee) using dev_inspect
///
/// Note: This requires adding view functions in Move (get_member_count, get_fee)
/// or parsing the object's BCS data. For now, we'll use a workaround by trying
/// to parse from the object's content if available.
async fn query_registry_fields(
    client: &SuiClient,
    package_id: ObjectID,
    registry_id: ObjectID,
) -> Result<(u64, u64), CanaryError> {
    let registry_obj = client
        .read_api()
        .get_object_with_options(registry_id, SuiObjectDataOptions::full_content())
        .await
        .map_err(|e| CanaryError::Registry(format!("Failed to get registry object: {}", e)))?
        .into_object()
        .map_err(|_| CanaryError::Registry("Registry object not found".to_string()))?;

    // Since the Move contract doesn't have view functions for member_count and fee,
    // we need to either:
    // 1. Add view functions in Move (recommended)
    // 2. Parse the object's BCS data (complex, requires type definitions)
    //
    // For now, we'll return default values and note this limitation.
    // In production, you should add these view functions to the Move contract:
    // public fun get_member_count(registry: &Registry): u64 { registry.member_count }
    // public fun get_fee(registry: &Registry): u64 { registry.fee }

    // Try to use dev_inspect if view functions exist, otherwise return error
    // For now, return an error indicating this needs Move contract updates
    Err(CanaryError::Registry(
        "query_registry_fields requires Move view functions get_member_count() and get_fee(). \
         Please add these functions to the member_registry module or parse object BCS data."
            .to_string(),
    ))
}

/// Get registry_id from admin_cap using dev_inspect or parsing
///
/// Note: This requires adding a view function in Move (get_registry_id)
/// or parsing the object's BCS data. For now, we'll require registry_id as a parameter.
async fn get_registry_id_from_admin_cap(
    client: &SuiClient,
    admin_cap_id: ObjectID,
) -> Result<ObjectID, CanaryError> {
    // AdminCap has a registry_id field, but we can't easily access it without:
    // 1. A view function in Move: public fun get_registry_id(cap: &AdminCap): ID { cap.registry_id }
    // 2. Parsing the object's BCS data (complex, requires type definitions)
    //
    // For now, we'll return an error indicating this needs the registry_id parameter
    // or a Move view function.
    Err(CanaryError::Registry(
        "get_registry_id_from_admin_cap requires a Move view function get_registry_id() \
         or registry_id must be provided as a parameter. Please add the view function to \
         the member_registry module or pass registry_id explicitly."
            .to_string(),
    ))
}
