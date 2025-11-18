/**
 * Contract Type Definitions
 * 
 * This module defines TypeScript interfaces for the Canary contract structs
 * and client configuration options.
 */

import type { Keypair } from '@mysten/sui/cryptography';
import type { Signer } from '@mysten/sui/cryptography';
import type { NetworkType } from '../client/sui-client-factory';

/**
 * Options for creating a CanaryClient instance
 */
export interface CanaryClientOptions {
  /** Network to connect to ('mainnet', 'testnet', 'devnet', 'localnet') or custom RPC URL */
  network?: NetworkType | string;
  /** Custom fullnode RPC URL (overrides network if provided) */
  fullnode?: string;
  /** Signer for transactions (Keypair or Signer instance) */
  signer?: Keypair | Signer;
  /** Package ID of the deployed Canary contract */
  packageId: string;
  /** Registry object ID (optional, can be set later) */
  registryId?: string;
}

/**
 * Registry struct from the contract
 * Note: This represents the on-chain struct, actual queries return simplified versions
 */
export interface Registry {
  id: string;
  memberCount: number;
  fee: number;
  balance: string; // Balance as string (MIST)
  admin: string;
}

/**
 * Member information struct
 */
export interface MemberInfo {
  domain: string;
  joinedAt: number; // Timestamp in milliseconds
}

/**
 * Member information with address
 */
export interface MemberInfoWithAddress {
  member: string; // Address
  domain: string;
  joinedAt: number; // Timestamp in milliseconds
}

/**
 * Admin capability struct
 */
export interface AdminCap {
  id: string;
  registryId: string;
}

/**
 * Membership capability struct
 */
export interface MembershipCap {
  id: string;
  registryId: string;
  member: string; // Address
}

/**
 * Canary blob struct
 */
export interface CanaryBlob {
  id: string;
  contractBlobId: string;
  explainBlobId: string;
  packageId: string;
  domain: string;
  uploadedAt: number; // Timestamp in milliseconds
  uploadedByAdmin: string; // Address
}

/**
 * Full canary blob information
 */
export interface CanaryBlobFullInfo {
  contractBlobId: string;
  explainBlobId: string;
  packageId: string;
  domain: string;
  uploadedAt: number;
  uploadedByAdmin: string;
}

/**
 * Registry information (simplified for queries)
 */
export interface RegistryInfo {
  id: string;
  memberCount: number;
  fee: number;
  admin: string;
}

