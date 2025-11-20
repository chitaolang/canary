/**
 * Claude AI Integration Utilities
 * 
 * This module provides functions to interact with Claude AI API for:
 * - Refactoring decompiled Move code
 * - Explaining decompiled Move functions
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

// Initialize Claude client
let anthropic: Anthropic | null = null;

/**
 * Get or initialize the Anthropic client
 */
function getAnthropicClient(): Anthropic {
    if (!anthropic) {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            throw new Error(
                'ANTHROPIC_API_KEY environment variable is not set. ' +
                'Please set it to use Claude AI features.'
            );
        }
        anthropic = new Anthropic({ apiKey });
    }
    return anthropic;
}

/**
 * Load the refactoring prompt from the markdown file
 */
async function loadRefactoringPrompt(): Promise<string> {
    const promptPath = resolve(__dirname, '../../move-decompile-refactor-prompt-en.md');
    try {
        return await readFile(promptPath, 'utf-8');
    } catch (error) {
        throw new Error(
            `Failed to load refactoring prompt from ${promptPath}: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}

/**
 * Refactors decompiled Move code using Claude AI
 * 
 * This function uses the prompt from move-decompile-refactor-prompt-en.md
 * to guide Claude AI in refactoring decompiled Move bytecode into more
 * readable, correct, and best-practice-compliant versions.
 * 
 * @param decompiledCode - The decompiled Move code as a string
 * @param options - Optional configuration
 * @param options.model - Claude model to use (default: 'claude-3-5-sonnet-20241022')
 * @param options.maxTokens - Maximum tokens in response (default: 4096)
 * @param options.temperature - Temperature for generation (default: 0.1)
 * @returns Promise resolving to the refactored code with explanations
 * 
 * @example
 * ```typescript
 * const decompiledCode = await readFile('decompiled.move', 'utf-8');
 * const refactored = await refactorDecompiledMoveCode(decompiledCode);
 * console.log(refactored);
 * ```
 */
export async function refactorDecompiledMoveCode(
    decompiledCode: string,
    options?: {
        model?: string;
        maxTokens?: number;
        temperature?: number;
    }
): Promise<string> {
    const client = getAnthropicClient();
    const prompt = await loadRefactoringPrompt();

    const model = "claude-sonnet-4-5";
    const maxTokens = options?.maxTokens || 4096;
    const temperature = options?.temperature ?? 0.1;

    try {
        const message = await client.beta.messages.create({
            model,
            max_tokens: maxTokens,
            betas: ["structured-outputs-2025-11-13"],
            temperature,
            system: prompt,
            messages: [
                {
                    role: 'user',
                    content: `\n\n---\n\nPlease refactor the following decompiled Move code and only output the refactored code:\n\n\`\`\`move\n${decompiledCode}\n\`\`\``,
                },
            ],
            output_format: {
                type: "json_schema",
                schema: {
                    type: "object",
                    properties: {
                        refactored_code: { type: "string" },
                    },
                    required: ["refactored_code"],
                    additionalProperties: false
                }
            }
        });

        // Extract text content from the response
        const content = message.content;
        if (Array.isArray(content)) {
            return content
                .map((block) => {
                    if (block.type === 'text') {
                        return block.text;
                    }
                    return '';
                })
                .join('\n');
        }

        return typeof content === 'string' ? content : '';
    } catch (error) {
        if (error instanceof Anthropic.APIError) {
            throw new Error(
                `Claude API error: ${error.message} (status: ${error.status})`
            );
        }
        throw new Error(
            `Failed to refactor decompiled Move code: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}

/**
 * Explains what each function does in decompiled Move code using Claude AI
 * 
 * This function analyzes decompiled Move code and provides detailed explanations
 * of what each function does, including:
 * - Function purpose and behavior
 * - Parameter descriptions
 * - Return value explanations
 * - Business logic insights
 * 
 * @param decompiledCode - The decompiled Move code as a string
 * @param options - Optional configuration
 * @param options.model - Claude model to use (default: 'claude-3-5-sonnet-20241022')
 * @param options.maxTokens - Maximum tokens in response (default: 2048)
 * @param options.temperature - Temperature for generation (default: 0.2)
 * @returns Promise resolving to detailed explanations of each function
 * 
 * @example
 * ```typescript
 * const decompiledCode = await readFile('decompiled.move', 'utf-8');
 * const explanation = await explainDecompiledFunctions(decompiledCode);
 * console.log(explanation);
 * ```
 */
export async function explainDecompiledFunctions(
    decompiledCode: string,
    options?: {
        model?: string;
        maxTokens?: number;
        temperature?: number;
    }
): Promise<string> {
    const client = getAnthropicClient();

    const model = "claude-sonnet-4-5";
    const maxTokens = options?.maxTokens || 2048;
    const temperature = options?.temperature ?? 0.2;

    const explanationPrompt = `You are an expert in analyzing Sui Move language code. Your task is to analyze decompiled Move code and provide detailed explanations of what each function does.

Please provide:
1. **Module Overview**: A brief overview of what this module does
2. **Struct Definitions**: Explanation of each struct and its purpose
3. **Function Analysis**: For each function, provide:
   - Function name and signature
   - Purpose and behavior
   - Parameter descriptions
   - Return value (if any)
   - Key logic and operations
   - Any important notes or considerations

Format your response in a clear, structured way with proper markdown formatting.

Now, analyze the following decompiled Move code:

\`\`\`move
${decompiledCode}
\`\`\``;

    try {
        const message = await client.beta.messages.create({
            model,
            max_tokens: maxTokens,
            betas: ["structured-outputs-2025-11-13"],
            temperature,
            messages: [
                {
                    role: 'user',
                    content: explanationPrompt,
                },
            ],
            output_format: {
                type: "json_schema",
                schema: {
                    type: "object",
                    properties: {
                        explanation: { type: "string" },
                    },
                    required: ["explanation"],
                    additionalProperties: false
                }
            }
        });

        // Extract text content from the response
        const content = message.content;
        if (Array.isArray(content)) {
            return content
                .map((block) => {
                    if (block.type === 'text') {
                        return block.text;
                    }
                    return '';
                })
                .join('\n');
        }

        return typeof content === 'string' ? content : '';
    } catch (error) {
        if (error instanceof Anthropic.APIError) {
            throw new Error(
                `Claude API error: ${error.message} (status: ${error.status})`
            );
        }
        throw new Error(
            `Failed to explain decompiled functions: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}

