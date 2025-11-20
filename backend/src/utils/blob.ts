import { bcs } from '@mysten/sui/bcs';
import { deriveObjectID } from '@mysten/sui/utils';

export const getDerivedId = (domain: string, moduleName: string, packageId: string, registryId: string) => {
    const bcsType = bcs.struct('CanaryKey', {
        prefix: bcs.vector(bcs.u8()),
        domain: bcs.string(),
        module_name: bcs.string(),
        package_id: bcs.Address
    });
    const canaryKey = bcsType.serialize({
        prefix: Array.from(Buffer.from('canary', 'utf8')), // 轉成 u8 array
        domain,
        module_name: moduleName,
        package_id: packageId
    })
    const objectId = deriveObjectID(registryId, `${packageId}::pkg_storage::CanaryKey`, canaryKey.toBytes());

    return objectId;
}