/**
 * Example usage of the Query Functions module
 * 
 * This file demonstrates how to use the query functions to read
 * contract state from the Canary contract.
 */

import {
  isMember,
  getMemberInfo,
  getAllMembers,
  getRegistryInfo,
  getAdmin,
  getFee,
} from './member-queries';
import {
  deriveCanaryAddress,
  canaryExists,
  getCanaryBlob,
  getBlobIds,
  getFullInfo,
} from './canary-queries';
import { CanaryClient } from '../client';
import { KeyManager } from '../key';

/**
 * Example: Check if address is a member
 */
export async function exampleIsMember() {
  const packageId = '0x...'; // Replace with actual package ID
  const registryId = '0x...'; // Replace with actual registry ID
  const address = '0x...'; // Address to check

  const client = new CanaryClient({
    network: 'testnet',
    packageId,
    registryId,
  });

  const member = await isMember(client.client, packageId, registryId, address);
  console.log(`Is member: ${member}`);

  return member;
}

/**
 * Example: Get member information
 */
export async function exampleGetMemberInfo() {
  const packageId = '0x...';
  const registryId = '0x...';
  const address = '0x...';

  const client = new CanaryClient({
    network: 'testnet',
    packageId,
    registryId,
  });

  const memberInfo = await getMemberInfo(client.client, packageId, registryId, address);
  console.log('Member info:', memberInfo);

  return memberInfo;
}

/**
 * Example: Get all members
 */
export async function exampleGetAllMembers() {
  const packageId = '0x...';
  const registryId = '0x...';

  const client = new CanaryClient({
    network: 'testnet',
    packageId,
    registryId,
  });

  const members = await getAllMembers(client.client, packageId, registryId);
  console.log(`Total members: ${members.length}`);
  members.forEach((member) => {
    console.log(`- ${member.member}: ${member.domain}`);
  });

  return members;
}

/**
 * Example: Get registry information
 */
export async function exampleGetRegistryInfo() {
  const registryId = '0x...';

  const client = new CanaryClient({
    network: 'testnet',
    packageId: '0x...',
    registryId,
  });

  const registryInfo = await getRegistryInfo(client.client, registryId);
  console.log('Registry info:', registryInfo);
  console.log(`Member count: ${registryInfo.memberCount}`);
  console.log(`Fee: ${registryInfo.fee} MIST`);

  return registryInfo;
}

/**
 * Example: Get admin address
 */
export async function exampleGetAdmin() {
  const packageId = '0x...';
  const registryId = '0x...';

  const client = new CanaryClient({
    network: 'testnet',
    packageId,
    registryId,
  });

  const admin = await getAdmin(client.client, packageId, registryId);
  console.log('Admin address:', admin);

  return admin;
}

/**
 * Example: Get membership fee
 */
export async function exampleGetFee() {
  const registryId = '0x...';

  const client = new CanaryClient({
    network: 'testnet',
    packageId: '0x...',
    registryId,
  });

  const fee = await getFee(client.client, registryId);
  console.log(`Membership fee: ${fee} MIST`);

  return fee;
}

/**
 * Example: Derive canary address
 */
export async function exampleDeriveCanaryAddress() {
  const packageId = '0xa58168ec04f9fb72a4bdfab1eabec92f46d36d0b1ac345f8db3a761a9b5c9b23';
  const registryId = '0x99cceb3ac10fc313b95968b8773a3938ca1c63c1a6a6d7367147a9730de9d6df';
  const domain = 'lending@scallop/core';

  const client = new CanaryClient({
    network: 'testnet',
    packageId,
    registryId,
  });
  const keyManager = new KeyManager();
  const keypair = keyManager.loadFromBech32('suiprivkey...');
  client.setSigner(keypair);

  const address = await deriveCanaryAddress(
    client.client,
    packageId,
    registryId,
    domain,
  );
  console.log(`Canary address for ${domain}: ${address}`);

  return address;
}

/**
 * Example: Check if canary exists
 */
export async function exampleCanaryExists() {
  const packageId = '0x...';
  const registryId = '0x...';
  const domain = 'example.com';
  const canaryPackageId = '0x...';

  const client = new CanaryClient({
    network: 'testnet',
    packageId,
    registryId,
  });

  const exists = await canaryExists(
    client.client,
    packageId,
    registryId,
    domain,
    canaryPackageId
  );
  console.log(`Canary exists: ${exists}`);

  return exists;
}

/**
 * Example: Get canary blob
 */
export async function exampleGetCanaryBlob() {
  const canaryBlobId = '0x...';

  const client = new CanaryClient({
    network: 'testnet',
    packageId: '0x...',
  });

  const blob = await getCanaryBlob(client.client, canaryBlobId);
  if (blob) {
    console.log('Canary blob:', blob);
    console.log(`Domain: ${blob.domain}`);
    console.log(`Package ID: ${blob.packageId}`);
  } else {
    console.log('Canary blob not found');
  }

  return blob;
}

/**
 * Example: Get blob IDs
 */
export async function exampleGetBlobIds() {
  const packageId = '0x...';
  const canaryBlobId = '0x...';

  const client = new CanaryClient({
    network: 'testnet',
    packageId,
  });

  const { contractBlobId, explainBlobId } = await getBlobIds(
    client.client,
    packageId,
    canaryBlobId
  );
  console.log(`Contract blob ID: ${contractBlobId}`);
  console.log(`Explain blob ID: ${explainBlobId}`);

  return { contractBlobId, explainBlobId };
}

/**
 * Example: Get full info
 */
export async function exampleGetFullInfo() {
  const packageId = '0x...';
  const canaryBlobId = '0x...';

  const client = new CanaryClient({
    network: 'testnet',
    packageId,
  });

  const fullInfo = await getFullInfo(client.client, packageId, canaryBlobId);
  console.log('Full info:', fullInfo);

  return fullInfo;
}

// Run examples (uncomment to test)
// exampleIsMember();
// exampleGetMemberInfo();
// exampleGetAllMembers();
// exampleGetRegistryInfo();
// exampleGetAdmin();
// exampleGetFee();
exampleDeriveCanaryAddress();
// exampleCanaryExists();
// exampleGetCanaryBlob();
// exampleGetBlobIds();
// exampleGetFullInfo();

