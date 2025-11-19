/**
 * Helper Utilities
 * 
 * This module provides utility functions for common operations.
 */

import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

/**
 * Converts SUI amount to MIST (smallest unit)
 * 1 SUI = 1,000,000,000 MIST
 * 
 * @param sui - Amount in SUI
 * @returns Amount in MIST
 * 
 * @example
 * ```typescript
 * const mist = parseSUI('1.5'); // 1500000000
 * ```
 */
export function parseSUI(sui: string | number): number {
  const amount = typeof sui === 'string' ? parseFloat(sui) : sui;
  return Math.floor(amount * 1_000_000_000);
}

/**
 * Converts MIST amount to SUI
 * 1 SUI = 1,000,000,000 MIST
 * 
 * @param mist - Amount in MIST
 * @returns Amount in SUI as string with up to 9 decimal places
 * 
 * @example
 * ```typescript
 * const sui = formatSUI(1500000000); // '1.5'
 * ```
 */
export function formatSUI(mist: number | bigint): string {
  const amount = typeof mist === 'bigint' ? Number(mist) : mist;
  return (amount / 1_000_000_000).toFixed(9).replace(/\.?0+$/, '');
}

/**
 * Formats a timestamp (milliseconds) to a Date object
 * 
 * @param timestamp - Timestamp in milliseconds
 * @returns Date object
 * 
 * @example
 * ```typescript
 * const date = formatTimestamp(1699123456789);
 * console.log(date.toISOString());
 * ```
 */
export function formatTimestamp(timestamp: number): Date {
  return new Date(timestamp);
}

/**
 * Gets the Clock object ID for the current network
 * The Clock object is a shared object available on all Sui networks
 * 
 * @param client - Sui client instance
 * @returns Clock object ID
 * 
 * @example
 * ```typescript
 * const clockId = await getClockObject(client);
 * ```
 */
export async function getClockObject(client: SuiClient): Promise<string> {
  // Clock object ID is the same across all networks
  // It's a well-known shared object
  return '0x6';
}

/**
 * Derives the canary address from registry, domain, and package ID
 * This matches the derive_canary_address function in the contract
 * 
 * Note: This is a client-side helper. For actual derivation, use the contract's
 * derive_canary_address function via RPC call.
 * 
 * @param registryId - Registry object ID
 * @param domain - Domain string
 * @param packageId - Package ID
 * @returns Derived address (for reference, actual derivation happens on-chain)
 */
export function deriveCanaryAddress(
  registryId: string,
  domain: string,
  packageId: string
): string {
  // This is a placeholder - actual derivation requires the contract's
  // derive_canary_address function which uses derived_object::derive_address
  // For now, return a note that this should be called via RPC
  throw new Error(
    'deriveCanaryAddress should be called via RPC using the contract\'s derive_canary_address function'
  );
}


export function getSplitSui(tx: Transaction, amount: string) {
  /*
  const coin = coins.pop()!;
  if (coins.length > 0) {
    tx.mergeCoins(
      tx.object(coin),
      coins.map((id) => tx.object(id))
    );
  }
  */
  const [splitCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(parseSUI(amount))]);

  return splitCoin;
}

export async function getSuiCoins(client: SuiClient, owner: string): Promise<string[]> {
  const firstPageCoins = await client.getCoins({
    owner: owner,
    coinType: '0x2::sui::SUI',
  });

  let hasNextPage = firstPageCoins.hasNextPage;
  let data = firstPageCoins.data;
  let nextCursor = firstPageCoins.nextCursor;
  while (hasNextPage) {
    const result = await client.getCoins({ owner: owner, coinType: '0x2::sui::SUI', cursor: nextCursor });
    data = [...data, ...result.data];
    hasNextPage = result.hasNextPage;
    nextCursor = result.nextCursor;
  }

  return data.map(coin => coin.coinObjectId);
}