import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
  GetPromptRequest,
  CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import { logger } from './utils/logging.js';
import { PromptProvider } from './prompts/provider.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { ToolProvider } from './tools/provider.js';
import { vectorSearchTools } from './tools/vector-search/index.js';
import { assetGenerateTools } from './tools/asset-generate/index.js';
import { skyboxGenerateTools } from './tools/skybox-generate/index.js';
import { audioGenerationTools } from './tools/audio-generate/index.js';
import { env } from './utils/env.js';

/**
 * MCP Server Implementation
 * Provides prompt functionality
 */
export class McpServer {
  private server: Server;
  private promptProvider: PromptProvider;
  private toolProvider: ToolProvider;

  constructor(options: { name: string; version: string }) {
    // Initialize prompt provider
    this.promptProvider = new PromptProvider();

    // Initialize tool provider and register tools
    this.toolProvider = new ToolProvider();
    this.registerTools();

    // Initialize MCP server
    this.server = new Server(
      {
        name: options.name,
        version: options.version,
      },
      {
        capabilities: {
          prompts: {},
          tools: {},
        },
      }
    );

    // Set up prompt-related handlers
    this.setupPromptHandlers();

    // Set up tool-related handlers
    this.setupToolHandlers();

    logger.info(`MCP server '${options.name}' v${options.version} initialized`);
  }

  /**
   * Register available tools
   */
  private registerTools(): void {
    // Check if all tools are enabled globally
    const enableAllTools = env.getBoolean('ENABLE_ALL_TOOLS', true);
    let registeredToolCount = 0;

    // Register asset generation tools (includes both static and cinematic)
    const enableAssetGenerateTools = enableAllTools && env.getBoolean('ENABLE_ASSET_GENERATE_TOOLS', true);
    if (enableAssetGenerateTools && assetGenerateTools.length > 0) {
      assetGenerateTools.forEach((tool) => {
        this.toolProvider.getRegistry().register(tool);
        registeredToolCount++;
      });
      logger.info(`${assetGenerateTools.length} asset generation tools registered`);
    } else {
      logger.info('Asset generation tools are disabled');
    }

    // Register vector search tools
    const enableVectorSearchTools = enableAllTools && env.getBoolean('ENABLE_VECTOR_SEARCH_TOOLS', true);
    if (enableVectorSearchTools && vectorSearchTools.length > 0) {
      vectorSearchTools.forEach((tool) => {
        this.toolProvider.getRegistry().register(tool);
        registeredToolCount++;
      });
      logger.info(`${vectorSearchTools.length} vector search tools registered`);
    } else {
      logger.info('Vector search tools are disabled');
    }

    // Register skybox generation tools
    const enableSkyboxGenerationTools = enableAllTools && env.getBoolean('ENABLE_SKYBOX_GENERATION_TOOL', true);
    if (enableSkyboxGenerationTools && skyboxGenerateTools.length > 0) {
      skyboxGenerateTools.forEach((tool) => {
        this.toolProvider.getRegistry().register(tool);
        registeredToolCount++;
      });
      logger.info(`${skyboxGenerateTools.length} skybox generation tools registered`);
    } else {
      logger.info('Skybox generation tools are disabled');
    }

    // Register audio generation tools
    const enableAudioGenerationTools = enableAllTools && env.getBoolean('ENABLE_AUDIO_GENERATION_TOOLS', true);
    if (enableAudioGenerationTools && audioGenerationTools.length > 0) {
      audioGenerationTools.forEach((tool) => {
        this.toolProvider.getRegistry().register(tool);
        registeredToolCount++;
      });
      logger.info(`${audioGenerationTools.length} audio generation tools registered`);
    } else {
      logger.info('Audio generation tools are disabled');
    }

    logger.info(`Total ${registeredToolCount} tools registered`);
  }

  /**
   * Set up prompt handlers
   */
  private setupPromptHandlers(): void {
    // Handle prompt list requests
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      const prompts = this.promptProvider.getRegistry().list();
      logger.debug('Processing prompt list request:', prompts.length);
      return { prompts };
    });

    // Handle prompt detail requests
    this.server.setRequestHandler(GetPromptRequestSchema, async (request: GetPromptRequest) => {
      const name = request.params.name;
      const args = request.params.arguments;
      logger.debug(`Processing prompt '${name}' request:`, args);

      try {
        const result = this.promptProvider.getRegistry().execute(name, args || {});
        return {
          description: result.description,
          messages: result.messages,
        };
      } catch (error) {
        logger.error(`Error while processing prompt '${name}':`, error);
        throw error;
      }
    });
  }

  /**
   * Set up tool handlers
   */
  private setupToolHandlers(): void {
    // Handle tool list requests
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = this.toolProvider
        .getRegistry()
        .list()
        .map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        }));

      logger.debug('Processing tool list request:', tools.length);
      return { tools };
    });

    // Handle tool call requests
    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request, extra) => {
        const { name, arguments: args } = request.params;
        const { signal } = extra;
        logger.debug(`Processing tool call '${name}' with arguments:`, args);

        if (!args) {
          throw new Error(`No arguments provided for tool: ${name}`);
        }

        try {
          return (await this.toolProvider
            .getRegistry()
            .execute(request, signal, this.server)) as CallToolResult;
        } catch (error) {
          logger.error(`Error while calling tool '${name}':`, error);

          return {
            content: [{ type: 'text', text: `Error: ${error}` }],
            isError: true,
          };
        }
      }
    );
  }

  /**
   * Connect server with the specified transport
   * @param transport Transport object (HTTP SSE, WebSocket, etc.)
   */
  public async connect(transport: Transport): Promise<void> {
    try {
      // Connect the server to the transport
      await this.server.connect(transport);
    } catch (error) {
      logger.error('MCP server connection failed:', error);
      throw error;
    }
  }

  /**
   * Disconnect server
   */
  public async disconnect(): Promise<void> {
    try {
      await this.server.close();
      logger.info('MCP server disconnected');
    } catch (error) {
      logger.error('MCP server disconnection failed:', error);
      throw error;
    }
  }
}
