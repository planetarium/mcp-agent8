import { Tool, ToolResult, ToolExecutionContext, ToolCategory, ToolMetadata } from '../types.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createOpenAI, OpenAIProvider } from '@ai-sdk/openai';
import { embed } from 'ai';
import { logger } from '../../utils/logging.js';
import { env } from '../../utils/env.js';

/**
 * Game Resource Search Tool
 *
 * Searches a vector database for game development resources and assets that match specific requirements
 * extracted from user messages. This tool performs semantic search to find the most relevant game assets
 * based on their descriptions and metadata.
 *
 * The tool supports various types of game assets including:
 * - 3D Models (characters, props, environments)
 * - Textures and Materials
 * - Sound Effects and Music
 * - Animations and VFX
 * - UI Elements and Icons
 *
 * Each asset in the database includes:
 * - Semantic description for vector search
 * - Asset metadata (type, format, tags)
 * - Download URL
 * - Optional preview URL
 */

interface SearchResult {
  id: bigint;
  description: string;
  url: string;
  metadata: ResourceMetadata;
  embedding: number[];
  similarity: number;
}

interface ResourceMetadata {
  tags: string[];
}

interface SearchGameResourcesArgs {
  userMessage: string;
  limit?: number;
}

export class GameResourceSearchTool implements Tool {
  name = 'search_game_resources';
  description = 'Searches and retrieves relevant game development assets from a vector database based on natural language descriptions. This tool performs semantic search to find game assets such as 3D models, textures, sounds, and animations that match the user\'s requirements. [WHEN TO USE THIS TOOL] Use this tool when users need to find specific game assets by describing what they\'re looking for, such as: 1) "A medieval knight character sprite sheet", 2) "Running animation for a humanoid character", 3) "Weapon swing sound effect", 4) "Forest environment background". The tool uses semantic similarity to find the most relevant assets based on their descriptions. Results include asset descriptions, URLs, and any associated metadata.';

  // Tool metadata for categorization and filtering
  metadata: ToolMetadata = {
    categories: [
      ToolCategory.VECTOR_SEARCH,
      ToolCategory.GAME_RESOURCE_SEARCH
    ]
  };

  inputSchema = {
    type: 'object',
    properties: {
      userMessage: {
        type: 'string',
        description:
          'A detailed description of the game asset being searched for. The more specific and descriptive the message, the better the search results will be. Example: "A pixel art sprite sheet for a medieval knight character with idle and attack animations"',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return',
        default: 5,
      },
    },
    required: ['userMessage'],
  };

  async execute(args: Record<string, any>, context: ToolExecutionContext): Promise<ToolResult> {
    const { userMessage, limit = 5 } = args as SearchGameResourcesArgs;
    const { progressCallback } = context;

    try {
      logger.info('Starting game resource search');

      if (progressCallback) {
        await progressCallback({
          progress: 1,
          total: 3,
          status: 'Initializing Search',
          message: 'Starting semantic search for game resources',
        });
      }

      const supabase = createClient(
        env.getRequired('SUPABASE_URL'),
        env.getRequired('SUPABASE_SERVICE_ROLE_KEY')
      );

      const openai = createOpenAI({
        apiKey: env.getRequired('OPENAI_API_KEY'),
      });

      const results = await this.searchResources({
        userMessage,
        limit,
        supabase,
        openai,
      });

      if (progressCallback) {
        await progressCallback({
          progress: 2,
          total: 3,
          status: 'Search Complete',
          message: `Found ${results.length} semantically matching resources`,
        });
      }

      logger.info(`Found ${results.length} game resources`);

      const formattedResults = this.formatSearchResults(results);

      if (progressCallback) {
        await progressCallback({
          progress: 3,
          total: 3,
          status: 'Complete',
          message: 'Search results formatted and ready',
        });
      }

      return {
        content: [
          {
            type: 'text',
            text: formattedResults,
          },
        ],
        isError: false,
      };
    } catch (error) {
      logger.error('Error in game resource search:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error during game resource search: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Performs semantic search for game resources in the vector database
   *
   * @param userMessage - Natural language description of desired game resource
   * @param limit - Maximum number of results to return
   * @param supabase - Supabase client instance
   * @param openai - OpenAI provider instance
   * @returns Array of matching game resources with similarity scores
   */
  private async searchResources({
    userMessage,
    limit,
    supabase,
    openai,
  }: {
    userMessage: string;
    limit: number;
    supabase: SupabaseClient;
    openai: OpenAIProvider;
  }): Promise<SearchResult[]> {
    const { embedding } = await embed({
      model: openai.embedding('text-embedding-ada-002'),
      value: userMessage,
    });

    const { data, error } = await supabase
      .rpc('match_resources', {
        query_embedding: embedding,
        match_count: limit,
      })
      .limit(limit);

    if (error) {
      throw error;
    }

    return data || [];
  }

  /**
   * Formats search results into a readable markdown string
   *
   * @param results - Array of search results to format
   * @returns Formatted markdown string with search results
   */
  private formatSearchResults(results: SearchResult[]): string {
    if (results.length === 0) {
      return 'No matching game resources found.';
    }

    let formatted = '## Found Game Resources\n\n';

    results.forEach((result, index) => {
      formatted += `### ${index + 1}. Resource\n\n`;
      formatted += `- Description: ${result.description}\n`;
      formatted += `- URL: ${result.url}\n`;
      if (result.metadata.tags && result.metadata.tags.length > 0) {
        formatted += `- Tags: ${result.metadata.tags.join(', ')}\n`;
      }
      formatted += `- Similarity: ${(result.similarity * 100).toFixed(1)}%\n`;
      formatted += '\n';
    });

    return formatted;
  }
}
