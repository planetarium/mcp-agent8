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
import { env } from './utils/env.js';
import { ToolCategory } from './tools/types.js';

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

    // Check asset generation tools group setting
    const enableAssetGenerateTools = env.getBoolean('ENABLE_ASSET_GENERATE_TOOLS', enableAllTools) ?? false;

    // Check individual asset tool type settings - enable if group is enabled or individual setting is true
    const enableImageTools = env.getBoolean('ENABLE_IMAGE_GENERATION_TOOLS', enableAssetGenerateTools) ?? false;
    const enableCinematicTools = env.getBoolean('ENABLE_CINEMATIC_GENERATION_TOOLS', enableAssetGenerateTools) ?? false;
    const enableAudioTools = env.getBoolean('ENABLE_AUDIO_GENERATION_TOOLS', enableAssetGenerateTools) ?? false;
    const enableSkyboxTools = env.getBoolean('ENABLE_SKYBOX_GENERATION_TOOLS', enableAssetGenerateTools) ?? false;

    // Create a map of category to enabled status
    const categoryEnabledMap = new Map<ToolCategory, boolean>([
      [ToolCategory.ASSET_GENERATION, enableAssetGenerateTools],
      [ToolCategory.IMAGE_GENERATION, enableImageTools],
      [ToolCategory.CINEMATIC_GENERATION, enableCinematicTools],
      [ToolCategory.AUDIO_GENERATION, enableAudioTools],
      [ToolCategory.SKYBOX_GENERATION, enableSkyboxTools],
    ]);

    // Register asset generation tools if any are enabled
    if ((enableImageTools || enableCinematicTools || enableAudioTools || enableSkyboxTools) &&
      assetGenerateTools.length > 0) {

      // Register tools based on their metadata
      assetGenerateTools.forEach((tool) => {
        // A tool should be registered if at least one of its categories is enabled
        const shouldRegister = tool.metadata.categories.some((category: ToolCategory) =>
          categoryEnabledMap.get(category) === true
        );

        if (shouldRegister) {
          this.toolProvider.getRegistry().register(tool);
          registeredToolCount++;
        }
      });

      // Log registered tools
      logger.info('Asset generation tools registered:');
      if (enableImageTools) logger.info('- Image generation tools enabled');
      if (enableCinematicTools) logger.info('- Cinematic generation tools enabled');
      if (enableAudioTools) logger.info('- Audio generation tools enabled');
      if (enableSkyboxTools) logger.info('- Skybox generation tools enabled');
    } else {
      logger.info('Asset generation tools are disabled');
    }

    // Check vector search tools group setting
    const enableVectorSearchTools = env.getBoolean('ENABLE_VECTOR_SEARCH_TOOLS', enableAllTools) ?? false;

    // Check individual vector search tool settings
    const enableCodeExampleSearchTool = env.getBoolean('ENABLE_CODE_EXAMPLE_SEARCH_TOOL', enableVectorSearchTools) ?? false;
    const enableGameResourceSearchTool = env.getBoolean('ENABLE_GAME_RESOURCE_SEARCH_TOOL', enableVectorSearchTools) ?? false;

    // Add vector search categories to the map
    categoryEnabledMap.set(ToolCategory.VECTOR_SEARCH, enableVectorSearchTools);
    categoryEnabledMap.set(ToolCategory.CODE_EXAMPLE_SEARCH, enableCodeExampleSearchTool);
    categoryEnabledMap.set(ToolCategory.GAME_RESOURCE_SEARCH, enableGameResourceSearchTool);

    // Register vector search tools if any are enabled
    if ((enableCodeExampleSearchTool || enableGameResourceSearchTool) &&
      vectorSearchTools.length > 0) {

      vectorSearchTools.forEach((tool) => {
        // A tool should be registered if at least one of its categories is enabled
        const shouldRegister = tool.metadata.categories.some((category: ToolCategory) =>
          categoryEnabledMap.get(category) === true
        );

        if (shouldRegister) {
          this.toolProvider.getRegistry().register(tool);
          registeredToolCount++;
        }
      });

      // Log registered tools
      logger.info('Vector search tools registered:');
      if (enableCodeExampleSearchTool) logger.info('- Code example search tool enabled');
      if (enableGameResourceSearchTool) logger.info('- Game resource search tool enabled');
    } else {
      logger.info('Vector search tools are disabled');
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
