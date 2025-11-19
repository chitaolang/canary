/**
 * Example usage of the Transaction Building module
 * 
 * This file demonstrates how to use the transaction builders to create
 * and execute transactions for the Canary contract.
 */

import {
    TransactionBlockBuilder,
    MemberRegistryTransactionBuilder,
    PackageStorageTransactionBuilder,
} from './index';
import { CanaryClient } from '../client';
import { parseSUI } from '../utils/helpers';

/**
 * Example: Join registry
 */
export async function exampleJoinRegistry() {
    const packageId = '0x...'; // Replace with actual package ID
    const registryId = '0x...'; // Replace with actual registry ID
    const paymentCoinId = '0x...'; // Replace with actual coin object ID

    // Create client
    const client = new CanaryClient({
        network: 'testnet',
        packageId,
        registryId,
    });

    // Create transaction builder
    const builder = new MemberRegistryTransactionBuilder(client.client, packageId);

    // Build join registry transaction
    const builderWithJoin = await builder.joinRegistry(registryId, 'example.com', '1');
    builderWithJoin.setGasBudget(10000000); // 0.01 SUI

    // Build and sign transaction
    const txBytes = await builderWithJoin.build();

    // Execute transaction (requires signer)
    if (client.hasSigner()) {
        const result = await client.client.signAndExecuteTransaction({
            signer: client.signer!,
            transaction: txBytes,
        });
        console.log('Transaction result:', result);
    }

    return builderWithJoin;
}

/**
 * Example: Withdraw funds (admin only)
 */
export function exampleWithdraw() {
    const packageId = '0x...';
    const registryId = '0x...';
    const adminCapId = '0x...';

    const client = new CanaryClient({
        network: 'testnet',
        packageId,
        registryId,
    });

    const builder = new MemberRegistryTransactionBuilder(client.client, packageId);

    // Withdraw 1 SUI
    builder
        .withdraw(registryId, adminCapId, parseSUI('1'))
        .setGasBudget(10000000);

    return builder;
}

/**
 * Example: Update fee (admin only)
 */
export function exampleUpdateFee() {
    const packageId = '0x...';
    const registryId = '0x...';
    const adminCapId = '0x...';

    const client = new CanaryClient({
        network: 'testnet',
        packageId,
        registryId,
    });

    const builder = new MemberRegistryTransactionBuilder(client.client, packageId);

    // Update fee to 2 SUI
    builder
        .updateFee(registryId, adminCapId, parseSUI('2'))
        .setGasBudget(10000000);

    return builder;
}

/**
 * Example: Remove member (admin only)
 */
export function exampleRemoveMember() {
    const packageId = '0x...';
    const registryId = '0x...';
    const adminCapId = '0x...';
    const memberAddress = '0x...'; // Address to remove

    const client = new CanaryClient({
        network: 'testnet',
        packageId,
        registryId,
    });

    const builder = new MemberRegistryTransactionBuilder(client.client, packageId);

    builder
        .removeMember(registryId, adminCapId, memberAddress)
        .setGasBudget(10000000);

    return builder;
}

/**
 * Example: Store canary blob (admin only)
 */
export async function exampleStoreBlob() {
    const packageId = '0x...';
    const registryId = '0x...';
    const adminCapId = '0x...';
    const contractBlobId = '0x...'; // Address of contract blob
    const explainBlobId = '0x...'; // Address of explanation blob
    const canaryPackageId = '0x...'; // Package ID for the canary

    const client = new CanaryClient({
        network: 'testnet',
        packageId,
        registryId,
    });

    const builder = new PackageStorageTransactionBuilder(client.client, packageId);

    const builderWithStore = await builder.storeBlob(
        registryId,
        adminCapId,
        'example.com',
        contractBlobId,
        explainBlobId,
        canaryPackageId
    );
    builderWithStore.setGasBudget(10000000);

    return builderWithStore;
}

/**
 * Example: Update canary blob (admin only)
 */
export async function exampleUpdateBlob() {
    const packageId = '0x...';
    const registryId = '0x...';
    const adminCapId = '0x...';
    const canaryBlobId = '0x...';
    const newContractBlobId = '0x...';
    const newExplainBlobId = '0x...';

    const client = new CanaryClient({
        network: 'testnet',
        packageId,
        registryId,
    });

    const builder = new PackageStorageTransactionBuilder(client.client, packageId);

    const builderWithUpdate = await builder.updateBlob(
        registryId,
        adminCapId,
        canaryBlobId,
        newContractBlobId,
        newExplainBlobId
    );
    builderWithUpdate.setGasBudget(10000000);

    return builderWithUpdate;
}

/**
 * Example: Delete canary blob (admin only)
 */
export function exampleDeleteCanaryBlob() {
    const packageId = '0x...';
    const registryId = '0x...';
    const adminCapId = '0x...';
    const canaryBlobId = '0x...';

    const client = new CanaryClient({
        network: 'testnet',
        packageId,
        registryId,
    });

    const builder = new PackageStorageTransactionBuilder(client.client, packageId);

    builder
        .deleteCanaryBlob(registryId, adminCapId, canaryBlobId)
        .setGasBudget(10000000);

    return builder;
}

/**
 * Example: Chaining multiple operations
 */
export async function exampleChainOperations() {
    const packageId = '0x...';
    const registryId = '0x...';
    const adminCapId = '0x...';

    const client = new CanaryClient({
        network: 'testnet',
        packageId,
        registryId,
    });

    const builder = new MemberRegistryTransactionBuilder(client.client, packageId);

    // Chain multiple operations in one transaction
    builder
        .updateFee(registryId, adminCapId, parseSUI('2'))
        .setGasBudget(10000000)
        .setSender('0x...'); // Set sender if needed

    return builder;
}

// Run examples (uncomment to test)
// exampleJoinRegistry();
// exampleWithdraw();
// exampleUpdateFee();
// exampleRemoveMember();
// exampleStoreBlob();
// exampleUpdateBlob();
// exampleDeleteCanaryBlob();
// exampleChainOperations();

