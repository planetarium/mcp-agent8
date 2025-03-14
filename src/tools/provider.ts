import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { Tool, ToolRegistry, ToolResult, ToolExecutionContext } from './types.js';
import { logger } from '../utils/logging.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

/**
 * Tool Provider class
 * Manages registration and execution of MCP tools
 */
export class ToolProvider {
  private registry: Registry;

  constructor() {
    this.registry = new Registry();
    logger.info('Tool provider initialized');
  }

  /**
   * Get the tool registry
   */
  getRegistry(): ToolRegistry {
    return this.registry;
  }
}

/**
 * Tool Registry implementation
 * Manages tool registration and execution
 */
class Registry implements ToolRegistry {
  private tools: Map<string, Tool>;

  constructor() {
    this.tools = new Map();
  }

  /**
   * Register a new tool
   */
  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      logger.warn(`Tool '${tool.name}' is already registered, replacing`);
    }
    this.tools.set(tool.name, tool);
    logger.info(`Tool '${tool.name}' registered`);
  }

  /**
   * Get a list of all registered tools
   */
  list(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get a specific tool by name
   */
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * Execute a tool based on a request
   */
  async execute(request: CallToolRequest, server?: Server): Promise<ToolResult> {
    const { name, arguments: toolArgs, progressToken } = request.params;
    logger.debug(`Executing tool '${name}' with arguments:`, toolArgs);

    const tool = this.tools.get(name);
    if (!tool) {
      logger.error(`Tool '${name}' not found`);
      return {
        content: [
          {
            type: 'text',
            text: `Error: Tool '${name}' not found`,
          },
        ],
        isError: true,
      };
    }

    try {
      // Ensure arguments is a proper object, defaulting to empty object if undefined
      const args = toolArgs || {};

      // Create abort controller for cancellation support
      // eslint-disable-next-line no-undef
      const abortController = new AbortController();

      // Define progress callback if progressToken is provided
      const progressCallback =
        progressToken && server
          ? async (progressData: any) => {
              await server.notification({
                method: 'notifications/progress',
                params: {
                  progressToken,
                  ...progressData,
                },
              });
            }
          : undefined;

      // Create execution context
      const context: ToolExecutionContext = {
        progressCallback,
        signal: abortController.signal,
      };

      // Execute the tool with context
      const result = await tool.execute(args as Record<string, any>, context);
      return result;
    } catch (error) {
      logger.error(`Error executing tool '${name}':`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `Error executing tool '${name}': ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }
}
