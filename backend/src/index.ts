import { KeyManager } from './key';
import { CanaryClient } from './client';
import { getAllMembers } from './queries/member-queries';
import { MemberRegistryTransactionBuilder } from './transactions/member-registry';
import { inspect } from 'util';
import dotenv from 'dotenv';


const env = dotenv.config();
console.log(env);
const keyManager = new KeyManager();
const keypair = keyManager.loadFromBech32(process.env.PRIVATE_KEY ?? '');
const address = keyManager.getAddress(keypair);

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

const canaryClient = new CanaryClient({
    network: process.env.SUI_NETWORK ?? 'testnet',
    packageId: process.env.CANARY_PACKAGE_ID ?? '',
    registryId: process.env.CANARY_REGISTRY_ID ?? '',
});

canaryClient.setSigner(keypair);

fetchMembers(canaryClient);