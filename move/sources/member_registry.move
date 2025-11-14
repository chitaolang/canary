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
}

// Init function
fun init(ctx: &mut TxContext) {
    let admin_cap = AdminCap {
        id: object::new(ctx),
    };

    let registry = Registry {
        id: object::new(ctx),
        members: table::new(ctx),
        fee: 1_000_000_000, // 1 SUI
        balance: balance::zero(),
        admin: tx_context::sender(ctx),
    };

    transfer::share_object(registry);
    transfer::transfer(admin_cap, tx_context::sender(ctx));
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
}

// Check if member
public fun is_member(registry: &Registry, addr: address): bool {
    table::contains(&registry.members, addr)
}

// Withdraw (admin only)
public entry fun withdraw(registry: &mut Registry, _: &AdminCap, amount: u64, ctx: &mut TxContext) {
    let withdrawn = balance::split(&mut registry.balance, amount);
    let coin = coin::from_balance(withdrawn, ctx);
    transfer::public_transfer(coin, tx_context::sender(ctx));
}
