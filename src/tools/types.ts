import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequest, Progress } from '@modelcontextprotocol/sdk/types.js';
import { V8User } from '../types/v8user.js';

/**
 * Tool category/type enumeration
 */
export enum ToolCategory {
  // Asset generation categories
  IMAGE_GENERATION = 'image_generation',
  CINEMATIC_GENERATION = 'cinematic_generation',
  AUDIO_GENERATION = 'audio_generation',
  SKYBOX_GENERATION = 'skybox_generation',

  // Vector search categories
  CODE_EXAMPLE_SEARCH = 'code_example_search',
  GAME_RESOURCE_SEARCH = 'game_resource_search',

  // Group categories
  ASSET_GENERATION = 'asset_generation',
  VECTOR_SEARCH = 'vector_search'
}

/**
 * Tool metadata interface
 */
export interface ToolMetadata {
  // Array of categories this tool belongs to
  categories: ToolCategory[];
}

/**
 * Progress callback interface for reporting tool execution progress
 */
export interface ProgressCallback {
  (progress: Progress): Promise<void>;
}

/**
 * Tool execution context for passing progress callback and abort signal
 */
export interface ToolExecutionContext {
  progressCallback?: ProgressCallback;
  // eslint-disable-next-line no-undef
  signal?: AbortSignal;
  v8User?: V8User;
}

/**
 * Tool interface definition
 */
export interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  // Tool metadata for categorization and filtering
  metadata: ToolMetadata;
  execute: (args: Record<string, any>, context: ToolExecutionContext) => Promise<ToolResult>;
}

/**
 * Tool result format compliant with MCP
 */
export interface ToolResult {
  content: ToolContent[];
  isError: boolean | undefined;
}

/**
 * Content types that can be returned by tools
 */
export type ToolContent = TextContent | ImageContent | ResourceContent;

/**
 * Text content type
 */
export interface TextContent {
  type: 'text';
  text: string;
}

/**
 * Image content type
 */
export interface ImageContent {
  type: 'image';
  data: string; // base64 encoded
  mimeType: string;
}

/**
 * Resource content type
 */
export interface ResourceContent {
  type: 'resource';
  resource: {
    uri: string;
    mimeType: string;
    text?: string;
  };
}

/**
 * Tool registry interface
 */
export interface ToolRegistry {
  register(tool: Tool): void;
  list(): Tool[];
  get(name: string): Tool | undefined;
  // eslint-disable-next-line no-undef
  execute(request: CallToolRequest, signal: AbortSignal, server: Server): Promise<ToolResult>;
}

/**
 * File map type definition (from the provided code)
 */
export interface FileMap {
  [path: string]: {
    type: 'file' | 'directory';
    content?: string;
    isBinary?: boolean;
  };
}

/**
 * Represents a code example retrieved from the vector database
 */
export interface Example {
  id: string;
  description: string;
  client_code?: string;
  server_code?: string;
  similarity: number;
  requirement?: string;
}
