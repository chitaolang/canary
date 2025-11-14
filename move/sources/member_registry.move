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

// Verify membership
public fun verify_membership(cap: &MembershipCap, registry: &Registry): address {
    assert!(cap.registry_id == object::id(registry), EInvalidCap);
    cap.member
}

entry fun seal_approve(cap: &MembershipCap, registry: &Registry, ctx: &TxContext) {
    assert!(cap.registry_id == object::id(registry), EInvalidCap);
}

// Verify admin
public fun verify_admin(admin_cap: &AdminCap, registry: &Registry) {
    assert!(admin_cap.registry_id == object::id(registry), ENotAdmin);
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
    verify_admin(admin_cap, registry);

    let withdrawn = balance::split(&mut registry.balance, amount);
    let coin = coin::from_balance(withdrawn, ctx);
    transfer::public_transfer(coin, tx_context::sender(ctx));
}

// Update fee (admin only)
public entry fun update_fee(registry: &mut Registry, admin_cap: &AdminCap, new_fee: u64) {
    verify_admin(admin_cap, registry);
    registry.fee = new_fee;
}

// Remove member (admin only)
public entry fun remove_member(registry: &mut Registry, admin_cap: &AdminCap, member: address) {
    verify_admin(admin_cap, registry);
    assert!(table::contains(&registry.members, member), ENotMember);
    table::remove(&mut registry.members, member);
}
