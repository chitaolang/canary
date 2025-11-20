import { SuiClient } from '@mysten/sui/client';
import { KeyManager } from './key';
import { CanaryClient } from './client';
import { getAllMembers } from './queries/member-queries';
import { MemberRegistryTransactionBuilder } from './transactions/member-registry';
import { inspect } from 'util';
import { fetchMvrCoreInfo } from './utils/mvr';
import { decompileMoveFile, fetchObjectBcs, getPkgModuleBytes, storeFileInTmp, readFileFromPath, fetchAdminCapId } from './utils/helpers';
import { createSuiClient } from './client/sui-client-factory';
import { join } from 'path';
import { explainDecompiledFunctions, refactorDecompiledMoveCode } from './utils/claude-ai';
import { createWalrusClient, readFileFromWalrus, readFileFromWalrusAsString, uploadFileToWalrus, uploadFilesToWalrus } from './utils/walrus';
import dotenv from 'dotenv';
import { blobIdFromInt } from '@mysten/walrus';
import { PackageStorageTransactionBuilder } from './transactions/pkg-storage';

import { deriveObjectID } from '@mysten/sui/utils';
import { bcs } from '@mysten/sui/bcs';
import { canaryExists } from './queries/canary-queries';

import { getDerivedId } from './utils/blob';
import { Transaction } from '@mysten/sui/transactions';

const env = dotenv.config();
const keyManager = new KeyManager();
const keypair = keyManager.loadFromBech32(process.env.PRIVATE_KEY ?? '');

const fetchRegistryFields = async (canaryClient: CanaryClient) => {
    const registry = await canaryClient.client.getObject({
        id: process.env.CANARY_REGISTRY_ID ?? '',
        options: {
            showContent: true,
        },
    });
    console.log(inspect(registry, { depth: null }));
};

const fetchMembers = async (canaryClient: CanaryClient) => {
    const members = await getAllMembers(
        canaryClient.client,
        canaryClient.packageId,
        canaryClient.registryId ?? ''
    );
    console.log(inspect(members, { depth: null }));
};

const joinRegistry = async (canaryClient: CanaryClient) => {
    const builder = new MemberRegistryTransactionBuilder(canaryClient.client, canaryClient.packageId);


    const builderWithJoin = await builder.joinRegistry(canaryClient.registryId ?? '', 'lending@scallop/core', '1');
    builderWithJoin.setGasBudget(10000000);
    builderWithJoin.setSender(canaryClient.getSignerAddress() ?? '');

    // Build and sign transaction
    const txBytes = await builderWithJoin.build();

    // Execute transaction (requires signer)
    if (canaryClient.hasSigner()) {
        const result = await canaryClient.client.signAndExecuteTransaction({
            signer: canaryClient.signer!,
            transaction: txBytes,
        });
        console.log('Transaction result:', inspect(result, { depth: null }));
    }
};

const explainPkg = async (moduleName: string, pkgModuleBytes: Uint8Array) => {
    const { dir, filePath } = await storeFileInTmp(`${moduleName}.mv`, pkgModuleBytes);
    console.log(`File saved to: ${filePath}`);
    const decompiledFilePath = await decompileMoveFile(filePath, join(dir, `${moduleName}.move`));
    console.log(`Decompiled file saved to: ${decompiledFilePath}`);
    if (!decompiledFilePath) {
        return false;
    }

    // Read the decompiled file content as a string
    const decompiledContent = await readFileFromPath(decompiledFilePath);
    const refactoredContent = await refactorDecompiledMoveCode(decompiledContent);
    const explanation = await explainDecompiledFunctions(refactoredContent);

    const { dir: refactoredDir, filePath: refactoredFilePath } = await storeFileInTmp(`${moduleName}-refactored.json`, refactoredContent);
    const { dir: explanationDir, filePath: explanationFilePath } = await storeFileInTmp(`${moduleName}-explanation.json`, explanation);
    console.log(`Refactored file saved to: ${refactoredFilePath}`);
    console.log(`Explanation file saved to: ${explanationFilePath}`);
    return {
        refactoredFilePath,
        explanationFilePath,
    };
}

const main = async () => {
    const canaryTestnetClient = new CanaryClient({
        network: process.env.SUI_NETWORK ?? 'testnet',
        packageId: process.env.CANARY_PACKAGE_ID ?? '',
        registryId: process.env.CANARY_REGISTRY_ID ?? '',
        signer: keypair,
    });
    const suiMainnetClient = createSuiClient('mainnet');
    const suiTestnetClient = createSuiClient('testnet');

    const walrusClient = createWalrusClient({
        network: 'testnet',
        suiClient: suiTestnetClient,
    });

    const adminCapId = await fetchAdminCapId(
        suiTestnetClient,
        keyManager.getAddress(keypair),
        process.env.CANARY_PACKAGE_ID ?? ''
    );
    if (!adminCapId) {
        throw new Error('Admin cap ID not found');
    }
    // fetch members
    const members = await getAllMembers(
        canaryTestnetClient.client,
        canaryTestnetClient.packageId,
        canaryTestnetClient.registryId ?? ''
    );

    let domains = members.map((member) => member.domain);
    // remove duplicate domains
    domains = [...new Set(domains)];

    for (const domain of domains) {
        console.log(`Processing domain: ${domain}`);
        if (canaryTestnetClient.registryId && canaryTestnetClient.packageId) {
            const storageTx = new Transaction()
            const domainInfo = await fetchMvrCoreInfo(domain);
            const pkgAddress = domainInfo.package_address;
            let packageInfo = await fetchPkgInfo(suiMainnetClient, suiTestnetClient, pkgAddress, canaryTestnetClient.registryId, domain);
            console.log('Uploading files to Walrus');
            const refactorBlobsInfo = (await uploadFilesToWalrus(walrusClient, suiTestnetClient, {
                filePaths: packageInfo.map((pkg) => pkg.refactoredFilePath),
                signer: keypair,
                epochs: 1,
                deletable: true,
                attributes: {
                    'upload-type': 'batch',
                },
            })).files;
            const explanationBlobsInfo = (await uploadFilesToWalrus(walrusClient, suiTestnetClient, {
                filePaths: packageInfo.map((pkg) => pkg.explanationFilePath),
                signer: keypair,
                epochs: 1,
                deletable: true,
                attributes: {
                    'upload-type': 'batch',
                },
            })).files;
            console.log('Building transaction...');
            for (let i = 0; i < packageInfo.length; i++) {
                const storageTxBuilder = new PackageStorageTransactionBuilder(canaryTestnetClient.client, canaryTestnetClient.packageId, storageTx);
                await storageTxBuilder.storeBlob(
                    canaryTestnetClient.registryId,
                    adminCapId,
                    domain,
                    packageInfo[i].moduleName,
                    refactorBlobsInfo[i].blobObjectId,
                    explanationBlobsInfo[i].blobObjectId,
                    canaryTestnetClient.packageId,
                );
            }
            storageTx.setSender(canaryTestnetClient.getSignerAddress());
            storageTx.setGasBudget(10000000);
            const tx = await storageTx;
            console.log('Sending transaction...');
            const result = await canaryTestnetClient.client.signAndExecuteTransaction({
                signer: canaryTestnetClient.signer!,
                transaction: tx,
            });
            console.log(`${domain} storage transaction result:`, inspect(result, { depth: null }));
        }
    }
    console.log('All modules checked');
}

const checkModuleExists = async (client: SuiClient, packageId: string, registryId: string, domain: string, moduleName: string) => {
    const derivedId = getDerivedId(domain, moduleName, packageId, registryId);
    const exists = await client.getObject({
        id: derivedId,
    });
    return exists.error ? false : true;
}

const fetchPkgInfo = async (suiMainnetClient: SuiClient, suiTestnetClient: SuiClient, packageId: string, registryId: string, domain: string) => {
    const pkgBcs = await fetchObjectBcs(suiMainnetClient, packageId);
    const pkgModuleMap = pkgBcs?.dataType === 'package' ? pkgBcs.moduleMap : undefined;
    let pkgModuleNames = Object.keys(pkgModuleMap ?? []);
    const packageInfo = []
    for (const moduleName of pkgModuleNames) {
        console.log(`Checking module: ${moduleName}`);
        const exists = await checkModuleExists(suiTestnetClient, packageId, registryId, domain, moduleName);
        if (!exists) {
            console.log(`Module ${moduleName} does not exist, explaining...`);
            const pkgModuleBytes = pkgBcs ? getPkgModuleBytes(pkgBcs, moduleName) : undefined;
            if (pkgModuleBytes) {
                const files = await explainPkg(moduleName, pkgModuleBytes);
                if (!files) {
                    continue;
                }
                packageInfo.push({
                    moduleName,
                    refactoredFilePath: files.refactoredFilePath,
                    explanationFilePath: files.explanationFilePath,
                });
            }
        }
    }
    return packageInfo;
}

const fetchPkg = async (suiMainnetClient: SuiClient, suiTestnetClient: SuiClient, canaryClient: CanaryClient) => {
    /*
    const walrusClient = createWalrusClient({
        network: 'testnet',
        suiClient: suiTestnetClient,
    });
    const info = await fetchMvrCoreInfo('lending@scallop/core');
    const pkgAddress = info.package_address;
    const pkgBcs = await fetchObjectBcs(suiMainnetClient, pkgAddress);
    const pkgModuleMap = pkgBcs?.dataType === 'package' ? pkgBcs.moduleMap : undefined;
    const pkgModuleNames = Object.keys(pkgModuleMap ?? []);
    const pkgModuleBytes = pkgBcs ? getPkgModuleBytes(pkgBcs, pkgModuleNames[0] ?? '') : undefined;
    if (pkgModuleBytes) {
        const { dir, filePath } = await storeFileInTmp(`${pkgModuleNames[0]}.mv`, pkgModuleBytes);
        console.log(`File saved to: ${filePath}`);
        const decompiledFilePath = await decompileMoveFile(filePath, join(dir, `${pkgModuleNames[0]}.move`));
        console.log(`Decompiled file saved to: ${decompiledFilePath}`);

        // Read the decompiled file content as a string
        const decompiledContent = await readFileFromPath(decompiledFilePath);
        const refactoredContent = await refactorDecompiledMoveCode(decompiledContent);
        console.log(refactoredContent);
        const { dir: refactoredDir, filePath: refactoredFilePath } = await storeFileInTmp(`${pkgModuleNames[0]}-refactored.json`, refactoredContent);
        console.log(`Refactored file saved to: ${refactoredFilePath}`);
        const result = await uploadFileToWalrus(walrusClient, suiTestnetClient, {
            filePath: refactoredFilePath,
            signer: keypair,
            epochs: 1,
            deletable: true,
            attributes: {
                'upload-type': 'batch',
            },
        });
        console.log(result);
    }
        */
    /*
     */
    /*
    const blobObject = await suiTestnetClient.getObject({
        id: '0xac4831fbd64e3f7e29ed9704f2b428b16a27fa6179560eab960b548060bf2271',
        options: {
            showContent: true,
        },
    });
    //@ts-ignore
    const blobId = blobObject.data?.content?.dataType === 'moveObject' ? blobObject.data.content.fields.blob_id : undefined;
    const blobId2 = blobIdFromInt(blobId)
    console.log('blobId', blobId, 'blobId2', blobId2);
    */
    /*
     const compiledcode = await readFileFromWalrusAsString(walrusClient, {
         blobId: 'frIrc9uZEa5-UVt4UfXgIhTpQrjifcfQ_NmjelsQKcw',
     });
     console.log(JSON.parse(compiledcode));
     */

    /*
   const registryId = process.env.CANARY_REGISTRY_ID ?? '';
   const adminCapId = await fetchAdminCapId(suiTestnetClient, keyManager.getAddress(keypair), process.env.CANARY_PACKAGE_ID ?? '');
   const domain = 'lending@scallop/core';
   const moduleName = 'accrue_interest';
   const contractBlobId = '0xac4831fbd64e3f7e29ed9704f2b428b16a27fa6179560eab960b548060bf2271';
   const explainBlobId = '0xac4831fbd64e3f7e29ed9704f2b428b16a27fa6179560eab960b548060bf2271';
   const packageId = process.env.CANARY_PACKAGE_ID ?? '';

   const builder = new PackageStorageTransactionBuilder(canaryClient.client, packageId);
   const builderWithStore = await builder.storeBlob(
       registryId,
       adminCapId ?? '',
       domain,
       moduleName,
       contractBlobId,
       explainBlobId,
       packageId
   );
   builderWithStore.setSender(canaryClient.getSignerAddress());
   builderWithStore.setGasBudget(10000000);
   const txBytes = await builderWithStore.build();
   const result = await canaryClient.client.signAndExecuteTransaction({
       signer: canaryClient.signer!,
       transaction: txBytes,
   });
   console.log('Transaction result:', inspect(result, { depth: null }));
   */

    /*
     const packageId = process.env.CANARY_PACKAGE_ID ?? '';
 
     const bcsType = bcs.struct('CanaryKey', {
         prefix: bcs.vector(bcs.u8()),
         domain: bcs.string(),
         module_name: bcs.string(),
         package_id: bcs.Address
     });
     const canaryKey = bcsType.serialize({
         prefix: Array.from(Buffer.from('canary', 'utf8')), // 轉成 u8 array
         domain: 'lending@scallop/core',
         module_name: 'accrue_interest',
         package_id: packageId
     })
     const objectId = deriveObjectID(canaryClient.registryId ?? '', `${packageId}::pkg_storage::CanaryKey`, canaryKey.toBytes());
     console.log('objectId', objectId);
 */
};

main();

// fetchMembers(canaryClient);
//fetchPkg(suiMainnetClient, suiTestnetClient, canaryTestnetClient);
// joinRegistry(canaryTestnetClient);