module canary::pkg_storage;

use canary::member_registry::{Self, Registry, AdminCap};
use std::string::String;
use sui::clock::{Self, Clock};
use sui::derived_object;

// Error codes
const ENotMember: u64 = 0;
const EDerivedObjectAlreadyExists: u64 = 1;
const ENotAuthorized: u64 = 2;
const ECanaryNotFound: u64 = 3;
const EDomainNotFound: u64 = 4;

// === Derived Object struct ===
public struct CanaryBlob has key {
    id: UID,
    blob_id: address,
    package_id: address,
    domain: String,
    uploaded_at: u64,
    uploaded_by_admin: address,
}

// === Derivation Key ===
public struct CanaryKey has copy, drop, store {
    prefix: vector<u8>, // "canary"
    domain: String,
    package_id: address,
}

public entry fun store_blob(
    registry: &mut Registry,
    admin_cap: &AdminCap,
    domain: String,
    blob_id: address,
    package_id: address,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    // Verify admin permission
    member_registry::verify_admin(admin_cap, registry);
    let sender = tx_context::sender(ctx);
    // Create derivation key
    let key = CanaryKey {
        prefix: b"canary",
        domain,
        package_id,
    };
    // Create derivation key

    // Get Registry UID for derivation
    let registry_uid = member_registry::registry_uid_mut(registry);

    // Check if derived object already exists
    assert!(!derived_object::exists(registry_uid, key), EDerivedObjectAlreadyExists);

    // Derive new UID from Registry UID
    let derived_uid = derived_object::claim(registry_uid, key);
    let canary_blob = CanaryBlob {
        id: derived_uid,
        blob_id,
        package_id,
        domain: key.domain,
        uploaded_at: clock::timestamp_ms(clock),
        uploaded_by_admin: sender,
    };

    transfer::share_object(canary_blob);
}

// === Update Blob (Admin Only) ===
public entry fun update_blob(
    registry: &Registry,
    admin_cap: &AdminCap,
    canary_blob: &mut CanaryBlob,
    new_blob_id: address,
    clock: &Clock,
    ctx: &TxContext,
) {
    // 驗證 Admin 權限
    member_registry::verify_admin(admin_cap, registry);

    canary_blob.blob_id = new_blob_id;
    canary_blob.uploaded_at = clock::timestamp_ms(clock);
    canary_blob.uploaded_by_admin = tx_context::sender(ctx);
}

// === Delete Derived Object (Admin Only) ===
public entry fun delete_canary_blob(
    registry: &Registry,
    admin_cap: &AdminCap,
    canary_blob: CanaryBlob,
) {
    // Verify Admin permission
    member_registry::verify_admin(admin_cap, registry);

    let CanaryBlob {
        id,
        blob_id: _,
        package_id: _,
        domain: _,
        uploaded_at: _,
        uploaded_by_admin: _,
    } = canary_blob;

    object::delete(id);
}

// === Public Query Functions (Anyone can query) ===
public fun get_blob_id(canary_blob: &CanaryBlob): address {
    canary_blob.blob_id
}

public fun get_package_id(canary_blob: &CanaryBlob): address {
    canary_blob.package_id
}

public fun get_domain(canary_blob: &CanaryBlob): String {
    canary_blob.domain
}

public fun get_uploaded_by(canary_blob: &CanaryBlob): address {
    canary_blob.uploaded_by_admin
}

public fun get_uploaded_at(canary_blob: &CanaryBlob): u64 {
    canary_blob.uploaded_at
}

public fun get_full_info(canary_blob: &CanaryBlob): (address, address, String, u64, address) {
    (
        canary_blob.blob_id,
        canary_blob.package_id,
        canary_blob.domain,
        canary_blob.uploaded_at,
        canary_blob.uploaded_by_admin,
    )
}

// === Check if Derived Object exists (Requires domain + package_id) ===
public fun canary_exists(registry: &Registry, domain: String, package_id: address): bool {
    let key = CanaryKey {
        prefix: b"canary",
        domain,
        package_id,
    };
    derived_object::exists(member_registry::registry_uid(registry), key)
}

// === Derive Address (Anyone can derive) ===
public fun derive_canary_address(
    registry: &Registry,
    domain: String,
    package_id: address,
): address {
    let key = CanaryKey {
        prefix: b"canary",
        domain,
        package_id,
    };
    derived_object::derive_address(
        object::uid_to_inner(member_registry::registry_uid(registry)),
        key,
    )
}
