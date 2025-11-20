/**
 * Helper Utilities
 * 
 * This module provides utility functions for common operations.
 */

import { RawData, SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { exec } from 'child_process';
import { writeFile, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join, resolve, dirname } from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

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
 * @param moduleName - Module name
 * @param packageId - Package ID
 * @returns Derived address (for reference, actual derivation happens on-chain)
 */
export function deriveCanaryAddress(
  registryId: string,
  domain: string,
  moduleName: string,
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

export async function fetchAdminCapId(client: SuiClient, owner: string, packageId: string) {
  const objects = await client.getOwnedObjects({
    owner: owner,
    filter: {
      Package: packageId,
    },
    options: {
      showContent: true,
    },
  });

  const adminCapObject = objects.data?.find(
    object => object.data?.content?.dataType === 'moveObject'
      && object.data?.content?.type === `${packageId}::member_registry::AdminCap`
  );

  return adminCapObject?.data?.objectId;
}

export async function fetchObjectBcs(client: SuiClient, id: string) {
  const object = await client.getObject({ id: id, options: { showBcs: true } });
  return object.data?.bcs;
}

export function getPkgModuleNames(pkgBcs: RawData) {
  const pkgModuleMap = pkgBcs?.dataType === 'package' ? pkgBcs.moduleMap : undefined;
  return Object.keys(pkgModuleMap ?? []);
}

export function getPkgModuleBytes(pkgBcs: RawData, moduleName: string) {
  const pkgModuleMap = pkgBcs?.dataType === 'package' ? pkgBcs.moduleMap : undefined;
  const base64Bytes = pkgModuleMap?.[moduleName];
  const moduleBytes = base64Bytes ? Uint8Array.from(Buffer.from(base64Bytes, "base64")) : undefined;

  return moduleBytes;
}

/**
 * Saves given data to a temporary file and returns the full path.
 * @param filename Name of the file to create in the tmp directory.
 * @param data File data as string or Buffer.
 * @returns Path to the temp file.
 */
export async function storeFileInTmp(filename: string, data: Uint8Array | string): Promise<{ dir: string, filePath: string }> {
  const dir = tmpdir();
  const filePath = join(dir, filename);
  await writeFile(filePath, data);
  return { dir, filePath };
}

/**
 * Reads a file from the given file path and returns its contents as a string.
 * 
 * @param filePath - The path to the file to read
 * @param encoding - The encoding to use (default: 'utf-8')
 * @returns Promise resolving to the file contents as a string
 * 
 * @example
 * ```typescript
 * const content = await readFileFromPath('/tmp/decompiled.move');
 * console.log(content);
 * ```
 */
export async function readFileFromPath(
  filePath: string,
  encoding: BufferEncoding = 'utf-8'
): Promise<string> {
  try {
    return await readFile(filePath, encoding);
  } catch (error) {
    throw new Error(
      `Failed to read file from ${filePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Executes the move-decompiler script with the given filename and saves the output.
 * 
 * @param filename - The filename to pass to move-decompiler (e.g., 'module.mv')
 * @param outputPath - The path where the output should be saved
 * @param options - Optional configuration
 * @param options.decompilerPath - Custom path to the move-decompiler script (defaults to ./backend/move-decompiler)
 * @param options.workingDir - Working directory for the command (defaults to backend directory)
 * @returns Promise resolving to the output path
 * 
 * @example
 * ```typescript
 * const outputPath = await decompileMoveFile('module.mv', '/tmp/decompiled.move');
 * ```
 */
export async function decompileMoveFile(
  filename: string,
  outputPath: string,
  options?: {
    decompilerPath?: string;
    workingDir?: string;
  }
): Promise<string | false> {
  // Resolve the decompiler path - default to backend/move-decompiler
  // __dirname will be dist/utils when compiled, so ../../ gets us to backend/
  const defaultDecompilerPath = resolve(__dirname, '../../move-decompiler');
  const decompilerPath = options?.decompilerPath || defaultDecompilerPath;

  // Default working directory to backend directory
  // This is where move-decompiler expects to run from
  const defaultWorkingDir = resolve(__dirname, '../..');
  const workingDir = options?.workingDir || defaultWorkingDir;

  // Ensure output directory exists
  const outputDir = dirname(outputPath);
  if (outputDir !== '.' && outputDir !== '/') {
    const { mkdir } = await import('fs/promises');
    await mkdir(outputDir, { recursive: true });
  }

  // Build the command: move-decompiler -- -b {filename}
  const command = `"${decompilerPath}" -b "${filename}"`;

  try {
    // Execute the command and capture stdout
    const { stdout, stderr } = await execAsync(command, {
      cwd: workingDir,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
    });

    // Write the output to the specified path
    await writeFile(outputPath, stdout, 'utf-8');

    // If there's stderr, log it but don't fail (some tools output warnings to stderr)
    if (stderr) {
      console.warn('move-decompiler stderr:', stderr);
    }

    return outputPath;
  } catch (error: any) {
    console.error(
      `Failed to decompile Move file: ${error.message}\n` +
      `Command: ${command}\n` +
      `Working directory: ${workingDir}`
    );
    return false
  }
}
