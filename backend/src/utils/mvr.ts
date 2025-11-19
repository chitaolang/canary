import axios from 'axios';

/**
 * MVR Core Info Type Definitions
 * 
 * These types represent the structure returned by the MVR (Move Version Registry) API.
 */

/**
 * Metadata information for a package
 */
export interface MvrMetadata {
    /** Icon URL for the package */
    icon_url: string;
    /** Description of the package */
    description: string;
    /** Homepage URL */
    homepage_url: string;
    /** Documentation URL */
    documentation_url: string;
}

/**
 * Package metadata (nested within package_info)
 */
export interface PackageInfoMetadata {
    /** Default name */
    default: string;
}

/**
 * Package information
 */
export interface MvrPackageInfo {
    /** Package ID (Sui address) */
    id: string;
    /** Git table ID (Sui address) */
    git_table_id: string;
    /** Default name for the package */
    default_name: string;
    /** Package metadata */
    metadata: PackageInfoMetadata;
}

/**
 * Git repository information
 */
export interface MvrGitInfo {
    /** Repository URL */
    repository_url: string;
    /** Path within the repository */
    path: string;
    /** Git tag/commit hash */
    tag: string;
}

/**
 * MVR Core Info response structure
 * 
 * This represents the complete response from the MVR API when fetching core information
 * for a domain name.
 */
export interface MvrCoreInfo {
    /** Domain name (e.g., "lending@scallop/core") */
    name: string;
    /** Package metadata (icon, description, URLs) */
    metadata: MvrMetadata;
    /** Package information (ID, git table, default name) */
    package_info: MvrPackageInfo;
    /** Git repository information */
    git_info: MvrGitInfo;
    /** Version number */
    version: number;
    /** Package address (Sui address) */
    package_address: string;
}

/**
 * Gets the MVR Core API URL for a given domain
 * 
 * @param domain - Domain name (e.g., "lending@scallop/core")
 * @returns Full URL to the MVR Core API endpoint
 * 
 * @example
 * ```typescript
 * const url = getMvrCoreUrl('lending@scallop/core');
 * // Returns: 'https://mainnet.mvr.mystenlabs.com/v1/names/lending@scallop/core/core'
 * ```
 */
export const getMvrCoreUrl = (domain: string): string => {
    return `https://mainnet.mvr.mystenlabs.com/v1/names/${domain}`;
}

/**
 * Fetches MVR Core information for a given domain
 * 
 * @param domain - Domain name (e.g., "lending@scallop/core")
 * @returns Promise resolving to MVR Core information
 * @throws Error if the request fails or domain is not found
 * 
 * @example
 * ```typescript
 * const info = await fetchMvrCoreInfo('lending@scallop/core');
 * console.log(info.name); // 'lending@scallop/core'
 * console.log(info.package_address); // '0x...'
 * ```
 */
export const fetchMvrCoreInfo = async (domain: string): Promise<MvrCoreInfo> => {
    const response = await axios.get<MvrCoreInfo>(getMvrCoreUrl(domain));
    return response.data;
}
