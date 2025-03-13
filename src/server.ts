import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListToolsRequestSchema,
  GetPromptRequest
} from '@modelcontextprotocol/sdk/types.js';
import { logger } from './utils/logging.js';
import { PromptProvider } from './prompts/provider.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';

/**
 * MCP Server Implementation
 * Provides prompt functionality
 */
export class McpServer {
  private server: Server;
  private promptProvider: PromptProvider;
  
  constructor(options: { name: string; version: string }) {
    // Initialize prompt provider
    this.promptProvider = new PromptProvider();
    
    // Initialize MCP server
    this.server = new Server(
      {
        name: options.name,
        version: options.version
      },
      {
        capabilities: {
          prompts: {},
          tools: {},
        }
      }
    );
    
    // Set up prompt-related handlers
    this.setupPromptHandlers();
    
    logger.info(`MCP server '${options.name}' v${options.version} initialized`);
  }
  
  /**
   * Set up prompt handlers
   */
  private setupPromptHandlers(): void {
    // Handle prompt list requests
    this.server.setRequestHandler(
      ListPromptsRequestSchema,
      async () => {
        const prompts = this.promptProvider.getRegistry().list();
        logger.debug('Processing prompt list request:', prompts.length);
        return { prompts };
      }
    );
    
    // Handle prompt detail requests
    this.server.setRequestHandler(
      GetPromptRequestSchema,
      async (request: GetPromptRequest) => {
        const name = request.params.name;
        const args = request.params.arguments;
        logger.debug(`Processing prompt '${name}' request:`, args);
        
        try {
          const result = this.promptProvider.getRegistry().execute(name, args || {});
          return {
            description: result.description,
            messages: result.messages
          };
        } catch (error) {
          logger.error(`Error while processing prompt '${name}':`, error);
          throw error;
        }
      }
    );

    // Handle tool list requests
    this.server.setRequestHandler(
      ListToolsRequestSchema,
      async () => {
        return {
          tools: [],
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
      logger.error(`MCP server connection failed:`, error);
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