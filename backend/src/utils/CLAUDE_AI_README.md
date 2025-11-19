# Claude AI Integration for Move Code Analysis

This module provides integration with Claude AI to help refactor and explain decompiled Move bytecode.

## Setup

1. **Install Dependencies** (already included in package.json):
   ```bash
   yarn install
   ```

2. **Set Environment Variable**:
   ```bash
   export ANTHROPIC_API_KEY="your-api-key-here"
   ```
   
   Or add it to your `.env` file:
   ```
   ANTHROPIC_API_KEY=your-api-key-here
   ```

## Functions

### `refactorDecompiledMoveCode(decompiledCode: string, options?)`

Refactors decompiled Move code into more readable, correct, and best-practice-compliant versions using Claude AI.

**Parameters:**
- `decompiledCode`: The decompiled Move code as a string
- `options` (optional):
  - `model`: Claude model to use (default: `'claude-3-5-sonnet-20241022'`)
  - `maxTokens`: Maximum tokens in response (default: `4096`)
  - `temperature`: Temperature for generation (default: `0.1`)

**Returns:** Promise<string> - Refactored code with explanations

**Example:**
```typescript
import { refactorDecompiledMoveCode } from './utils/claude-ai';
import { readFile } from 'fs/promises';

const decompiledCode = await readFile('decompiled.move', 'utf-8');
const refactored = await refactorDecompiledMoveCode(decompiledCode);
console.log(refactored);
```

### `explainDecompiledFunctions(decompiledCode: string, options?)`

Explains what each function does in decompiled Move code using Claude AI.

**Parameters:**
- `decompiledCode`: The decompiled Move code as a string
- `options` (optional):
  - `model`: Claude model to use (default: `'claude-3-5-sonnet-20241022'`)
  - `maxTokens`: Maximum tokens in response (default: `2048`)
  - `temperature`: Temperature for generation (default: `0.2`)

**Returns:** Promise<string> - Detailed explanations of each function

**Example:**
```typescript
import { explainDecompiledFunctions } from './utils/claude-ai';
import { readFile } from 'fs/promises';

const decompiledCode = await readFile('decompiled.move', 'utf-8');
const explanation = await explainDecompiledFunctions(decompiledCode);
console.log(explanation);
```

## Complete Workflow Example

```typescript
import { 
  refactorDecompiledMoveCode, 
  explainDecompiledFunctions 
} from './utils/claude-ai';
import { decompileMoveFile, storeFileInTmp, getPkgModuleBytes } from './utils/helpers';
import { readFile } from 'fs/promises';
import { join } from 'path';

// 1. Decompile Move bytecode (using existing helpers)
const moduleBytes = getPkgModuleBytes(pkgBcs, 'module_name');
const { dir, filePath } = await storeFileInTmp('module.mv', moduleBytes);
const decompiledPath = await decompileMoveFile(filePath, join(dir, 'module.move'));

// 2. Read decompiled code
const decompiledCode = await readFile(decompiledPath, 'utf-8');

// 3. Refactor the code
const refactoredCode = await refactorDecompiledMoveCode(decompiledCode);
console.log('Refactored:', refactoredCode);

// 4. Get function explanations
const explanation = await explainDecompiledFunctions(decompiledCode);
console.log('Explanations:', explanation);
```

## Available Models

- `claude-3-5-sonnet-20241022` (default) - Good balance of speed and quality
- `claude-3-opus-20240229` - Best quality, slower, more expensive
- `claude-3-5-haiku-20241022` - Fastest, lower cost, good for simple code

## Error Handling

Both functions will throw errors if:
- `ANTHROPIC_API_KEY` is not set
- API key is invalid
- Network errors occur
- API rate limits are exceeded
- Input code is malformed

Example error handling:
```typescript
try {
  const refactored = await refactorDecompiledMoveCode(decompiledCode);
} catch (error) {
  if (error.message.includes('ANTHROPIC_API_KEY')) {
    console.error('Please set ANTHROPIC_API_KEY environment variable');
  } else {
    console.error('Error:', error.message);
  }
}
```

## Cost Considerations

- Claude API usage is billed per token
- `refactorDecompiledMoveCode` uses more tokens (default: 4096 max)
- `explainDecompiledFunctions` uses fewer tokens (default: 2048 max)
- Consider using `claude-3-5-haiku` for simple code to reduce costs
- Monitor your API usage in the Anthropic dashboard

## See Also

- [Claude AI Integration Plan](../CLAUDE_AI_INTEGRATION_PLAN.md)
- [Move Decompile Refactor Prompt](../../move-decompile-refactor-prompt-en.md)
- [Example Usage](./claude-ai-example.ts)

