/**
 * Example usage of Claude AI integration for Move code refactoring and explanation
 * 
 * This file demonstrates how to use the Claude AI utilities to:
 * 1. Refactor decompiled Move code
 * 2. Explain decompiled Move functions
 * 
 * Prerequisites:
 * - Set ANTHROPIC_API_KEY environment variable
 * - Have decompiled Move code ready (from decompileMoveFile function)
 */

import { refactorDecompiledMoveCode, explainDecompiledFunctions } from './claude-ai';
import { readFile } from 'fs/promises';
import { decompileMoveFile, readFileFromPath, storeFileInTmp } from './helpers';
import { join } from 'path';

/**
 * Example: Refactor decompiled Move code
 */
export async function exampleRefactorDecompiledCode() {
  const apiKey = '...'
  try {
    // Step 1: Read decompiled Move code (assuming you already have it)
    const decompiledCode = await readFile('/tmp/decompiled.move', 'utf-8');

    // Step 2: Refactor using Claude AI
    console.log('Refactoring decompiled Move code with Claude AI...');
    const refactoredCode = await refactorDecompiledMoveCode(decompiledCode, apiKey);

    // Step 3: Save or use the refactored code
    console.log('Refactored code:');
    console.log(refactoredCode);

    // Optionally save to file
    // await writeFile('/tmp/refactored.move', refactoredCode, 'utf-8');

    return refactoredCode;
  } catch (error) {
    console.error('Error refactoring code:', error);
    throw error;
  }
}

/**
 * Example: Explain decompiled Move functions
 */
export async function exampleExplainDecompiledFunctions() {
  const apiKey = '...'
  try {
    // Step 1: Read decompiled Move code
    const decompiledCode = await readFile('/tmp/decompiled.move', 'utf-8');

    // Step 2: Get explanations from Claude AI
    console.log('Analyzing decompiled Move functions with Claude AI...');
    const explanation = await explainDecompiledFunctions(decompiledCode, apiKey);

    // Step 3: Display or save the explanation
    console.log('Function explanations:');
    console.log(explanation);

    // Optionally save to file
    // await writeFile('/tmp/explanation.md', explanation, 'utf-8');

    return explanation;
  } catch (error) {
    console.error('Error explaining functions:', error);
    throw error;
  }
}

/**
 * Complete workflow: Decompile -> Refactor -> Explain
 */
export async function exampleCompleteWorkflow(
  moduleBytes: Uint8Array,
  moduleName: string
) {
  const apiKey = '...'
  try {
    // Step 1: Decompile Move bytecode
    console.log(`Decompiling ${moduleName}...`);
    const { dir, filePath } = await storeFileInTmp(`${moduleName}.mv`, moduleBytes);
    const decompiledPath = await decompileMoveFile(
      filePath,
      join(dir, `${moduleName}.move`)
    );
    console.log(`Decompiled to: ${decompiledPath}`);
    if (!decompiledPath) {
      throw new Error('Failed to decompile Move bytecode');
    }
    // Step 2: Read decompiled code
    const decompiledCode = await readFileFromPath(decompiledPath);

    // Step 3: Refactor the code
    console.log('Refactoring with Claude AI...');
    const refactoredCode = await refactorDecompiledMoveCode(decompiledCode, apiKey);
    console.log('Refactored code received');

    // Step 4: Get function explanations
    console.log('Getting function explanations...');
    const explanation = await explainDecompiledFunctions(decompiledCode, apiKey);
    console.log('Explanations received');

    return {
      decompiledPath,
      decompiledCode,
      refactoredCode,
      explanation,
    };
  } catch (error) {
    console.error('Error in complete workflow:', error);
    throw error;
  }
}


