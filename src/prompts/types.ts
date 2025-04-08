import { z } from 'zod';

/**
 * Prompt message role
 */
export enum MessageRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant'
}

/**
 * Prompt message type
 */
export interface PromptMessage {
  role: MessageRole;
  content: {
    type: 'text';
    text: string;
  };
}

/**
 * Prompt definition interface
 */
export interface PromptDefinition<T extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  schema: T;
  generator: (args: z.infer<T>) => {
    messages: PromptMessage[];
  };
}

/**
 * Prompt argument definition
 */
export interface PromptArgument {
  name: string;
  description: string;
  required: boolean;
}

/**
 * Prompt metadata interface
 */
export interface PromptMetadata {
  name: string;
  description: string;
  arguments: PromptArgument[];
}

/**
 * Prompt result interface
 */
export interface PromptResult {
  description: string;
  messages: PromptMessage[];
}
