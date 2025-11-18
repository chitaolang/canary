/**
 * Contract Constants
 * 
 * This module defines constants used throughout the Canary SDK.
 */

/**
 * Module names in the Canary package
 */
export const MODULES = {
  MEMBER_REGISTRY: 'member_registry',
  PKG_STORAGE: 'pkg_storage',
} as const;

/**
 * Function names in member_registry module
 */
export const MEMBER_REGISTRY_FUNCTIONS = {
  JOIN_REGISTRY: 'join_registry',
  WITHDRAW: 'withdraw',
  UPDATE_FEE: 'update_fee',
  REMOVE_MEMBER: 'remove_member',
} as const;

/**
 * Function names in pkg_storage module
 */
export const PKG_STORAGE_FUNCTIONS = {
  STORE_BLOB: 'store_blob',
  UPDATE_BLOB: 'update_blob',
  DELETE_CANARY_BLOB: 'delete_canary_blob',
} as const;

/**
 * Error codes from the contract
 */
export const ERROR_CODES = {
  E_INSUFFICIENT_PAYMENT: 0,
  E_ALREADY_MEMBER: 1,
  E_NOT_ADMIN: 2,
  E_NOT_MEMBER: 3,
  E_INVALID_CAP: 4,
  E_DERIVED_OBJECT_ALREADY_EXISTS: 1, // From pkg_storage (same code as E_ALREADY_MEMBER but different module)
} as const;

/**
 * Error code to message mapping
 * Note: Code 1 is used by both E_ALREADY_MEMBER and E_DERIVED_OBJECT_ALREADY_EXISTS
 * The actual error message depends on which module/function was called
 */
export const ERROR_MESSAGES: Record<number, string> = {
  [ERROR_CODES.E_INSUFFICIENT_PAYMENT]: 'Insufficient payment amount',
  [ERROR_CODES.E_ALREADY_MEMBER]: 'Address is already a member',
  [ERROR_CODES.E_NOT_ADMIN]: 'Not authorized as admin',
  [ERROR_CODES.E_NOT_MEMBER]: 'Address is not a member',
  [ERROR_CODES.E_INVALID_CAP]: 'Invalid capability object',
  // Note: Code 1 can mean either E_ALREADY_MEMBER or E_DERIVED_OBJECT_ALREADY_EXISTS
  // depending on the context. The contract will return the appropriate error.
};

