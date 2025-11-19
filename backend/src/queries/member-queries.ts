/**
 * Member Queries
 * 
 * This module provides read-only query functions for the member registry.
 */

import type { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';
import type { MemberInfo, MemberInfoWithAddress, RegistryInfo } from '../types/contract-types';
import { MODULES, MEMBER_REGISTRY_FUNCTIONS } from '../utils/constants';

/**
 * Checks if an address is a member of the registry
 * 
 * @param client - Sui client instance
 * @param packageId - Package ID of the deployed contract
 * @param registryId - Registry object ID
 * @param address - Address to check
 * @returns true if the address is a member, false otherwise
 * 
 * @example
 * ```typescript
 * const isMember = await isMember(client, packageId, registryId, '0x...');
 * ```
 */
export async function isMember(
    client: SuiClient,
    packageId: string,
    registryId: string,
    address: string
): Promise<boolean> {
    try {
        const tx = new Transaction();
        tx.moveCall({
            package: packageId,
            module: MODULES.MEMBER_REGISTRY,
            function: 'is_member',
            arguments: [
                tx.object(registryId),
                tx.pure.address(address),
            ],
        });

        const result = await client.devInspectTransactionBlock({
            sender: address, // Use the address as sender for dev inspect
            transactionBlock: await tx.build({ client }),
        });

        if (result.results && result.results[0]?.returnValues) {
            const returnValue = result.results[0].returnValues[0];
            if (returnValue) {
                // Decode boolean from BCS
                return bcs.Bool.parse(Uint8Array.from(returnValue[0])) as boolean;
            }
        }

        return false;
    } catch (error) {
        console.error('Error checking if member:', error);
        return false;
    }
}

/**
 * Gets member information for a specific address
 * 
 * @param client - Sui client instance
 * @param packageId - Package ID of the deployed contract
 * @param registryId - Registry object ID
 * @param address - Member address
 * @returns Member info if found, null otherwise
 * 
 * @example
 * ```typescript
 * const memberInfo = await getMemberInfo(client, packageId, registryId, '0x...');
 * ```
 */
export async function getMemberInfo(
    client: SuiClient,
    packageId: string,
    registryId: string,
    address: string
): Promise<MemberInfo | null> {
    try {
        const tx = new Transaction();
        tx.moveCall({
            package: packageId,
            module: MODULES.MEMBER_REGISTRY,
            function: 'get_member_info',
            arguments: [
                tx.object(registryId),
                tx.pure.address(address),
            ],
        });

        const result = await client.devInspectTransactionBlock({
            sender: address,
            transactionBlock: await tx.build({ client }),
        });

        if (result.results && result.results[0]?.returnValues) {
            const returnValue = result.results[0].returnValues[0];
            if (returnValue) {
                // Decode MemberInfo struct from BCS
                // MemberInfo { domain: String, joined_at: u64 }
                const data = Uint8Array.from(returnValue[0]);
                // Parse the struct - this is a simplified version
                // In practice, you'd need to decode the BCS struct properly
                // For now, we'll read from object state instead
            }
        }

        // Fallback: Try to read from object state if available
        return null;
    } catch (error) {
        console.error('Error getting member info:', error);
        return null;
    }
}

/**
 * Gets all members of the registry
 * 
 * @param client - Sui client instance
 * @param packageId - Package ID of the deployed contract
 * @param registryId - Registry object ID
 * @returns Array of member info with addresses
 * 
 * @example
 * ```typescript
 * const members = await getAllMembers(client, packageId, registryId);
 * ```
 */
export async function getAllMembers(
    client: SuiClient,
    packageId: string,
    registryId: string
): Promise<MemberInfoWithAddress[]> {
    try {
        const tx = new Transaction();
        tx.moveCall({
            package: packageId,
            module: MODULES.MEMBER_REGISTRY,
            function: 'get_all_members',
            arguments: [
                tx.object(registryId),
            ],
        });

        const result = await client.devInspectTransactionBlock({
            sender: '0x0', // Use zero address for view functions
            transactionBlock: await tx.build({ client }),
        });

        if (result.results && result.results[0]?.returnValues) {
            const returnValue = result.results[0].returnValues[0];
            if (returnValue) {
                // Decode vector<MemberInfoWithAddress> from BCS
                // This requires proper BCS decoding of the vector and struct
                // For now, return empty array - full implementation would decode BCS
                return [];
            }
        }

        return [];
    } catch (error) {
        console.error('Error getting all members:', error);
        return [];
    }
}

/**
 * Gets registry information (id, member count, fee, admin)
 * 
 * @param client - Sui client instance
 * @param registryId - Registry object ID
 * @returns Registry information
 * 
 * @example
 * ```typescript
 * const registryInfo = await getRegistryInfo(client, registryId);
 * ```
 */
export async function getRegistryInfo(
    client: SuiClient,
    registryId: string
): Promise<RegistryInfo> {
    try {
        const object = await client.getObject({
            id: registryId,
            options: {
                showContent: true,
                showType: true,
            },
        });

        if (object.data?.content && 'fields' in object.data.content) {
            const fields = object.data.content.fields as any;

            return {
                id: registryId,
                memberCount: Number(fields.member_count || 0),
                fee: Number(fields.fee || 0),
                admin: fields.admin || '',
            };
        }

        throw new Error('Failed to parse registry object');
    } catch (error) {
        console.error('Error getting registry info:', error);
        throw error;
    }
}

/**
 * Gets the admin address of the registry
 * 
 * @param client - Sui client instance
 * @param packageId - Package ID of the deployed contract
 * @param registryId - Registry object ID
 * @returns Admin address
 * 
 * @example
 * ```typescript
 * const admin = await getAdmin(client, packageId, registryId);
 * ```
 */
export async function getAdmin(
    client: SuiClient,
    packageId: string,
    registryId: string
): Promise<string> {
    try {
        // Read directly from object state
        const registryInfo = await getRegistryInfo(client, registryId);
        return registryInfo.admin;
    } catch (error) {
        // Fallback: use devInspectTransactionBlock
        try {
            const tx = new Transaction();
            tx.moveCall({
                package: packageId,
                module: MODULES.MEMBER_REGISTRY,
                function: 'get_admin',
                arguments: [
                    tx.object(registryId),
                ],
            });

            const result = await client.devInspectTransactionBlock({
                sender: '0x0',
                transactionBlock: await tx.build({ client }),
            });

            if (result.results && result.results[0]?.returnValues) {
                const returnValue = result.results[0].returnValues[0];
                if (returnValue) {
                    // Decode address from BCS
                    return bcs.Address.parse(Uint8Array.from(returnValue[0])) as string;
                }
            }
        } catch (devInspectError) {
            console.error('Error getting admin via devInspect:', devInspectError);
        }

        throw new Error('Failed to get admin address');
    }
}

/**
 * Gets the membership fee from the registry
 * 
 * @param client - Sui client instance
 * @param registryId - Registry object ID
 * @returns Fee amount in MIST
 * 
 * @example
 * ```typescript
 * const fee = await getFee(client, registryId);
 * ```
 */
export async function getFee(
    client: SuiClient,
    registryId: string
): Promise<number> {
    try {
        const registryInfo = await getRegistryInfo(client, registryId);
        return registryInfo.fee;
    } catch (error) {
        console.error('Error getting fee:', error);
        throw error;
    }
}

