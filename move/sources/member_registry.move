module canary::member_registry;

use std::string::String;
use sui::balance::{Self, Balance};
use sui::clock::{Self, Clock};
use sui::coin::{Self, Coin};
use sui::sui::SUI;
use sui::table::{Self, Table};

// Error codes
const EInsufficientPayment: u64 = 0;
const EAlreadyMember: u64 = 1;
const ENotAdmin: u64 = 2;
const ENotMember: u64 = 3;
const EInvalidCap: u64 = 4;

// Main struct
public struct Registry has key {
    id: UID,
    members: Table<address, MemberInfo>,
    member_addresses: Table<u64, address>, // Index -> address mapping
    member_count: u64, // Total number of members
    fee: u64,
    balance: Balance<SUI>,
    admin: address,
}

public struct MemberInfo has copy, drop, store {
    domain: String,
    joined_at: u64,
}

// Admin cap
public struct AdminCap has key {
    id: UID,
    registry_id: ID,
}

// Membership cap
public struct MembershipCap has key, store {
    id: UID,
    registry_id: ID,
    member: address,
}

// Init function
fun init(ctx: &mut TxContext) {
    let sender = tx_context::sender(ctx);

    let registry = Registry {
        id: object::new(ctx),
        members: table::new(ctx),
        member_addresses: table::new(ctx),
        member_count: 0,
        fee: 1_000_000_000, // 1 SUI
        balance: balance::zero(),
        admin: sender,
    };

    let registry_id = object::id(&registry);

    let admin_cap = AdminCap {
        id: object::new(ctx),
        registry_id,
    };

    transfer::share_object(registry);
    transfer::transfer(admin_cap, sender);
}

// Join registry
public entry fun join_registry(
    registry: &mut Registry,
    payment: Coin<SUI>,
    domain: String,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    // Validate payment amount
    assert!(coin::value(&payment) >= registry.fee, EInsufficientPayment);

    let sender = tx_context::sender(ctx);

    // Check if already joined
    assert!(!table::contains(&registry.members, sender), EAlreadyMember);

    // Add member info
    let member_info = MemberInfo {
        domain,
        joined_at: clock::timestamp_ms(clock),
    };
    table::add(&mut registry.members, sender, member_info);

    // Add to member_addresses table with current count as index
    table::add(&mut registry.member_addresses, registry.member_count, sender);
    registry.member_count = registry.member_count + 1;

    // Process payment
    let paid = coin::into_balance(payment);
    balance::join(&mut registry.balance, paid);

    // Issue membership cap
    let membership_cap = MembershipCap {
        id: object::new(ctx),
        registry_id: object::id(registry),
        member: sender,
    };

    transfer::transfer(membership_cap, sender);
}

// Withdraw (admin only)
public entry fun withdraw(
    registry: &mut Registry,
    admin_cap: &AdminCap,
    amount: u64,
    ctx: &mut TxContext,
) {
    assert!(admin_cap.registry_id == object::id(registry), ENotAdmin);

    let withdrawn = balance::split(&mut registry.balance, amount);
    let coin = coin::from_balance(withdrawn, ctx);
    transfer::public_transfer(coin, tx_context::sender(ctx));
}

// Update fee (admin only)
public entry fun update_fee(registry: &mut Registry, admin_cap: &AdminCap, new_fee: u64) {
    assert!(admin_cap.registry_id == object::id(registry), ENotAdmin);
    registry.fee = new_fee;
}

// Remove member (admin only)
public entry fun remove_member(registry: &mut Registry, admin_cap: &AdminCap, member: address) {
    assert!(admin_cap.registry_id == object::id(registry), ENotAdmin);
    assert!(table::contains(&registry.members, member), ENotMember);
    table::remove(&mut registry.members, member);

    // Find and remove from member_addresses table using swap-with-last pattern
    let mut i = 0;
    let mut found_index = registry.member_count; // Use invalid index as sentinel
    let count = registry.member_count;

    // Find the index of the member to remove
    while (i < count) {
        let addr = *table::borrow(&registry.member_addresses, i);
        if (addr == member) {
            found_index = i;
            break
        };
        i = i + 1;
    };

    // If found, swap with last element and remove
    if (found_index < count) {
        let last_index = count - 1;
        if (found_index < last_index) {
            // Swap: get last element, remove it, then replace found_index with it
            let last_addr = *table::borrow(&registry.member_addresses, last_index);
            table::remove(&mut registry.member_addresses, last_index);
            table::remove(&mut registry.member_addresses, found_index);
            table::add(&mut registry.member_addresses, found_index, last_addr);
        } else {
            // Removing the last element, just remove it
            table::remove(&mut registry.member_addresses, found_index);
        };
        registry.member_count = registry.member_count - 1;
    };
}

// Verify admin
public fun verify_admin(admin_cap: &AdminCap, registry: &Registry) {
    assert!(admin_cap.registry_id == object::id(registry), ENotAdmin);
}

entry fun seal_approve(cap: &MembershipCap, registry: &Registry) {
    assert!(cap.registry_id == object::id(registry), EInvalidCap);
}

// Check if member
public fun is_member(registry: &Registry, addr: address): bool {
    table::contains(&registry.members, addr)
}

// Get member info
public fun get_member_info(registry: &Registry, addr: address): &MemberInfo {
    table::borrow(&registry.members, addr)
}

public fun get_admin(registry: &Registry): address {
    registry.admin
}

// === 獲取 Registry UID（給其他 module 用於派生）===
public fun registry_uid(registry: &Registry): &UID {
    &registry.id
}

public fun registry_uid_mut(registry: &mut Registry): &mut UID {
    &mut registry.id
}

// Struct to hold member info with address for return value
public struct MemberInfoWithAddress has copy, drop, store {
    member: address,
    domain: String,
    joined_at: u64,
}

// Get all member info at once
public fun get_all_members(registry: &Registry): vector<MemberInfoWithAddress> {
    let mut result = vector::empty<MemberInfoWithAddress>();
    let mut i = 0;
    let count = registry.member_count;

    while (i < count) {
        let addr = *table::borrow(&registry.member_addresses, i);
        let member_info = table::borrow(&registry.members, addr);
        vector::push_back(
            &mut result,
            MemberInfoWithAddress {
                member: addr,
                domain: member_info.domain,
                joined_at: member_info.joined_at,
            },
        );
        i = i + 1;
    };

    result
}

// Public entry function to get all members
// Note: Entry functions cannot return values in Sui Move
// Use the public function get_all_members() for RPC calls instead
public entry fun get_all_members_entry(_registry: &Registry) {}
