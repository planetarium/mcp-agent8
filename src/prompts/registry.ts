import { z } from 'zod';
import { logger } from '../utils/logging.js';
import {
  PromptDefinition,
  PromptMetadata,
  PromptArgument,
  PromptResult,
  PromptMessage
} from './types.js';

/**
 * Prompt Registry Class
 * Registers and manages prompt definitions.
 */
export class PromptRegistry {
  private prompts: Map<string, PromptDefinition>;

  constructor() {
    this.prompts = new Map();
  }

  /**
   * Register prompt
   */
  public register<T extends z.ZodTypeAny>(
    name: string,
    description: string,
    schema: T,
    generator: (args: z.infer<T>) => { messages: PromptMessage[] }
  ): void {
    if (this.prompts.has(name)) {
      logger.warn(`Prompt '${name}' is already registered. Overwriting.`);
    }

    this.prompts.set(name, {
      name,
      description,
      schema,
      generator
    });

    logger.info(`Prompt '${name}' has been registered.`);
  }

  /**
   * Get prompt list
   */
  public list(): PromptMetadata[] {
    return Array.from(this.prompts.values()).map(prompt => ({
      name: prompt.name,
      description: prompt.description,
      arguments: this.extractArguments(prompt.schema)
    }));
  }

  /**
   * Get prompt
   */
  public get(name: string): PromptDefinition | undefined {
    return this.prompts.get(name);
  }

  /**
   * Execute prompt
   */
  public execute(name: string, args: unknown): PromptResult {
    const prompt = this.prompts.get(name);
    if (!prompt) {
      throw new Error(`Prompt '${name}' not found.`);
    }

    try {
      // Validate arguments
      const validatedArgs = prompt.schema.parse(args);

      // Generate prompt
      const result = prompt.generator(validatedArgs);

      return {
        description: prompt.description,
        messages: result.messages
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error(`Prompt '${name}' argument validation failed:`, error.errors);
        throw new Error(`Prompt argument validation failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Extract argument information from schema
   */
  private extractArguments(schema: z.ZodTypeAny): PromptArgument[] {
    // Helper function to extract argument information from zod schema
    // Actual implementation can be complex, but providing a simple implementation
    if (schema instanceof z.ZodObject) {
      return Object.entries(schema.shape).map(([key, value]) => {
        const isOptional = value instanceof z.ZodOptional;
        const baseType = isOptional
          ? (value as z.ZodOptional<any>).unwrap()
          : value;

        let description = '';
        if ('description' in baseType && typeof baseType.description === 'string') {
          description = baseType.description;
        }

        return {
          name: key,
          description,
          required: !isOptional
        };
      });
    }

    return [];
  }
}
