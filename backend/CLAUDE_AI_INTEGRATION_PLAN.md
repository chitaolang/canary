# Claude AI Integration Plan

## Overview
Integrate Claude AI API to help refactor and explain decompiled Move bytecode code.

## Features to Implement

### 1. Refactor Decompiled Move Code
- **Function**: `refactorDecompiledMoveCode(decompiledCode: string): Promise<string>`
- **Purpose**: Use Claude AI to refactor decompiled Move code into more readable, correct, and best-practice-compliant versions
- **Prompt Source**: Uses the prompt from `move-decompile-refactor-prompt-en.md`
- **Input**: Decompiled Move code as string
- **Output**: Refactored Move code with explanations

### 2. Explain Decompiled Functions
- **Function**: `explainDecompiledFunctions(decompiledCode: string): Promise<string>`
- **Purpose**: Use Claude AI to explain what each function does in decompiled Move code
- **Input**: Decompiled Move code as string
- **Output**: Detailed explanation of each function's purpose and behavior

## Implementation Details

### File Structure
- Create new file: `src/utils/claude-ai.ts`
- Export functions from `src/utils/index.ts`
- Add example usage in `src/index.ts` or create separate example file

### Dependencies
- Already installed: `@anthropic-ai/sdk` (v0.70.0)
- Environment variable needed: `ANTHROPIC_API_KEY`

### API Configuration
- Model: `claude-3-5-sonnet-20241022` or `claude-3-opus-20240229` (for better code understanding)
- Max tokens: 4096 for refactoring, 2048 for explanations
- Temperature: 0.1 (for consistent, focused output)

### Error Handling
- Handle API rate limits
- Handle invalid API keys
- Handle network errors
- Handle malformed input code

### Usage Flow
1. User decompiles Move bytecode using existing `decompileMoveFile()` function
2. User reads the decompiled code
3. User calls `refactorDecompiledMoveCode()` or `explainDecompiledFunctions()`
4. Results are returned as strings (can be saved to files)

## Example Usage

```typescript
import { refactorDecompiledMoveCode, explainDecompiledFunctions } from './utils/claude-ai';
import { readFile } from 'fs/promises';

// After decompiling
const decompiledCode = await readFile('decompiled.move', 'utf-8');

// Refactor the code
const refactoredCode = await refactorDecompiledMoveCode(decompiledCode);
console.log(refactoredCode);

// Or explain functions
const explanation = await explainDecompiledFunctions(decompiledCode);
console.log(explanation);
```

## Future Enhancements
- Batch processing for multiple modules
- Save refactored code to files automatically
- Compare original vs refactored code
- Interactive mode for iterative refactoring
- Support for different Claude models based on code complexity

