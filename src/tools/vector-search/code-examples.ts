import { embed, generateText, LanguageModel } from 'ai';
import { createOpenAI, OpenAIProvider } from '@ai-sdk/openai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Tool, ToolResult, Example, FileMap, ToolExecutionContext, ToolCategory, ToolMetadata } from '../types.js';
import { logger } from '../../utils/logging.js';
import { env } from '../../utils/env.js';

/**
 * Code Example Search Tool
 *
 * Searches a vector database for code examples that match specific requirements
 * extracted from user messages.
 */
export class CodeExampleSearchTool implements Tool {
  name = 'search_code_examples';
  description =
    'Searches and retrieves relevant game development code examples from a vector database based on specific game development requirements or programming challenges. This tool performs semantic search to find code snippets and examples that match the user\'s game development needs. It analyzes both the user message and associated tags to identify the most appropriate game code examples from the database. [WHEN TO USE THIS TOOL] You should use this tool whenever the user asks about game implementation details, game programming patterns, specific game feature implementations, or requests examples of how to implement something in game development. USE THIS TOOL if the user mentions specific game programming tasks, asks "how do I code X in my game", or needs reference implementations for game mechanics, rendering, physics, AI, or other game-specific systems. The results are returned in a structured format containing game client code, game server code, and descriptive explanations when available. The userMessage parameter should include detailed context about the game programming challenge or implementation requirement, while the tags parameter should specify relevant game engines, frameworks, or concepts to narrow the search scope. Note: This tool does not generate complete games but rather provides existing code snippets and examples that address specific game implementation challenges. The quality of search results heavily depends on the clarity and specificity of the provided user message and tags. Examples typically demonstrate solutions to common game implementation problems and can be used as reference material for your own game development work. Common scenarios where this tool is useful include: 1) When a user asks "How do I implement character movement in Unity?", 2) When they need examples of game state management for specific operations, 3) When they want to see how others have implemented a specific game UI component, 4) When they need patterns for game networking, 5) When they request code for handling specific game physics edge cases. IMPORTANT: You should proactively offer to search for game code examples whenever a user is discussing game implementation details or asking how to build something in a game, even if they don\'t explicitly request examples. Always prefer showing existing, tested game code examples over generating new code when possible. If you are uncertain whether relevant game code examples exist for a user\'s question, it is better to use this tool and check rather than assume none are available. Even partial matches can provide valuable game implementation insights to users.';

  // Tool metadata for categorization and filtering
  metadata: ToolMetadata = {
    categories: [
      ToolCategory.VECTOR_SEARCH,
      ToolCategory.CODE_EXAMPLE_SEARCH
    ]
  };

  // Tool input schema in JSONSchema format
  inputSchema = {
    type: 'object',
    properties: {
      userMessage: {
        type: 'string',
        description: 'A detailed description of the game programming problem or implementation challenge that requires code examples. THIS MUST BE PROVIDED IN ENGLISH ONLY. Extract the core game implementation requirements from the user\'s query, focusing on what they\'re trying to build or implement in their game. This should include context about what the user is trying to accomplish, specific technical requirements, game engines or technologies being used, and any constraints or edge cases that need to be addressed. The more specific and detailed this description is, the more relevant the returned game code examples will be. Examples of good messages include explaining a complex game mechanic integration, describing a game UI component behavior, detailing a game physics simulation, or requesting help with game AI implementation.',
      },
      tags: {
        type: 'array',
        items: {
          type: 'string',
        },
        description: 'An array of specific keywords, game engines, frameworks, or game programming concepts that help narrow down the search. ALL TAGS MUST BE IN ENGLISH ONLY. Always include both general game technology categories (e.g., "Unity", "Unreal Engine") AND specific game concepts (e.g., "character controller", "collision detection") relevant to the query. If the user mentions any game technologies, ALWAYS include them as tags. Commonly useful tags include: "Unity", "Unreal Engine", "Godot", "Phaser", "game physics", "game AI", "pathfinding", "animation", "game networking", "procedural generation", "particle systems", "game UI", "state management", "input handling", etc. Each tag should be a string that precisely identifies a game technology (e.g., "Unity", "Unreal Engine", "WebGL"), a game programming concept (e.g., "physics", "AI", "rendering"), or a specific game feature (e.g., "character controller", "inventory system", "dialog system"). Tags are used to filter the vector database search and improve the relevance of returned game examples. Include both broad and specific tags to ensure comprehensive results.',
      },
    },
    required: ['userMessage', 'tags'],
  };

  /**
   * Execute the vector DB search
   */
  async execute(args: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolResult> {
    const { userMessage, tags } = args;
    const { progressCallback, signal } = context;

    try {
      logger.info('Starting vector DB search');

      // Progress update - Starting search
      if (progressCallback) {
        await progressCallback({
          progress: 1,
          total: 4,
          status: 'Starting search',
          message: 'Initializing vector database search',
        });
      }

      // Check for cancellation
      if (signal?.aborted) {
        throw new Error('Search operation was cancelled');
      }

      // Search vector DB
      const codeExamples = await this.searchExamplesFromVectorDB({
        tags,
        supabase: createClient(
          env.getRequired('SUPABASE_URL'),
          env.getRequired('SUPABASE_SERVICE_ROLE_KEY')
        ),
        openai: createOpenAI({
          apiKey: env.getRequired('OPENAI_API_KEY'),
        }),
      });

      logger.info('Vector DB search completed. Found ' + codeExamples.length + ' code examples.');
      // Progress update - Search completed
      if (progressCallback) {
        await progressCallback({
          progress: 2,
          total: 4,
          status: 'Search completed',
          message: `Found ${codeExamples.length} code examples`,
          examplesFound: codeExamples.length,
        });
      }

      // Check for cancellation
      if (signal?.aborted) {
        throw new Error('Search operation was cancelled');
      }

      // Start relevance filtering
      const model = createOpenAI({
        apiKey: env.getRequired('OPENAI_API_KEY'),
      }).languageModel('gpt-4o-mini');

      const relevantExamples = await this.filterRelevantExamples({
        tags,
        examples: codeExamples,
        userMessage,
        model,
      });

      logger.info('Relevance evaluation completed. Found ' + relevantExamples.length + ' relevant examples.');
      // Progress update - Filtering completed
      if (progressCallback) {
        await progressCallback({
          progress: 3,
          total: 4,
          status: 'Relevance evaluation completed',
          message: `Found ${relevantExamples.length} relevant examples`,
          relevantExamples: relevantExamples.length,
        });
      }

      // Format results
      const result: FileMap = {};
      relevantExamples.forEach((example, index) => {
        const basePath = `example-${index + 1}`;

        if (example.client_code) {
          result[`${basePath}/client.js`] = {
            type: 'file',
            content: example.client_code,
            isBinary: false,
          };
        }

        if (example.server_code) {
          result[`${basePath}/server.js`] = {
            type: 'file',
            content: example.server_code,
            isBinary: false,
          };
        }

        result[`${basePath}/description.md`] = {
          type: 'file',
          content: `# ${example.requirement || 'Code Example'}\n\n${example.description}`,
          isBinary: false,
        };
      });
      const formattedResults = this.formatSearchResults(result);

      logger.info('Formatting results completed');
      logger.debug(`Formatted results: ${formattedResults.length} characters`);

      // Progress update - Complete
      if (progressCallback) {
        await progressCallback({
          progress: 4,
          total: 4,
          status: 'Complete',
          message: 'Code example search completed',
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
      logger.error('Error in vector DB search:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error searching vector database: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Format search results as readable text
   */
  private formatSearchResults(results: FileMap): string {
    if (Object.keys(results).length === 0) {
      return 'No relevant code examples found.';
    }

    let formatted = '## Found Code Examples\n\n';

    const examples: Record<string, { description?: string; files: string[] }> = {};

    for (const path in results) {
      const match = path.match(/example-(\d+)/);
      if (match) {
        const exampleNum = match[1];
        if (!examples[exampleNum]) {
          examples[exampleNum] = { files: [] };
        }

        if (path.includes('description.md')) {
          examples[exampleNum].description = results[path].content || '';
        } else {
          examples[exampleNum].files.push(path);
        }
      }
    }

    Object.entries(examples).forEach(([num, example]) => {
      formatted += `### Example ${num}\n\n`;

      if (example.description) {
        formatted += `${example.description}\n\n`;
      }

      formatted += '**Files:**\n';
      example.files.forEach((file) => {
        formatted += `- \`${file}\`\n`;
      });

      formatted += '\n';
    });

    return formatted;
  }

  /**
   * Search vector database for examples matching requirements
   */
  private async searchExamplesFromVectorDB({
    tags,
    supabase,
    openai,
  }: {
    tags: string[];
    supabase: SupabaseClient;
    openai: OpenAIProvider;
  }): Promise<Example[]> {
    const results: Example[] = [];
    const seenIds = new Set<string>();

    // Search for each requirement
    for (const tag of tags) {
      try {
        const { embedding } = await embed({
          model: openai.embedding('text-embedding-ada-002'),
          value: tag,
        });

        const { data, error } = await supabase.rpc('match_codebase', {
          query_embedding: embedding,
          match_count: 5,
        });

        if (error) {
          logger.error(`Vector search error for "${tag}":`, error);
          continue;
        }

        if (data && data.length > 0) {
          // Only add items that haven't been seen before
          for (const item of data) {
            if (!seenIds.has(item.id)) {
              seenIds.add(item.id);
              results.push({
                ...item,
                tag,
              });
            }
          }
        }
      } catch (error) {
        logger.error(`Error searching for "${tag}":`, error);
      }
    }

    return results;
  }

  /**
   * Filter and evaluate the usefulness of code examples for the current request
   */
  private async filterRelevantExamples(props: {
    tags: string[];
    examples: Example[];
    userMessage: string;
    model: LanguageModel;
  }): Promise<Example[]> {
    const { tags, examples, userMessage, model } = props;

    if (examples.length === 0) {
      return [];
    }

    const ellipsed: Example[] = examples.map((ex) => ({
      id: ex.id,
      description: ex.description,
      clientCode: ex.client_code
        ? ex.client_code.length > 300
          ? ex.client_code.substring(0, 300) + '...'
          : ex.client_code
        : '',
      serverCode: ex.server_code
        ? ex.server_code.length > 300
          ? ex.server_code.substring(0, 300) + '...'
          : ex.server_code
        : '',
      similarity: ex.similarity,
      requirement: ex.requirement,
    }));

    try {
      const resp = await generateText({
        system: `
          You are an AI assistant that helps developers by evaluating the relevance of code examples to their needs.
          Your task is to analyze code examples retrieved from a database and determine which ones are truly relevant 
          and helpful for the user's current request.
        `,
        prompt: `
          User's request: "${userMessage}"
          Tags:
          ${tags.map((req) => `- ${req}`).join('\n')}

          Found code examples:
          ${JSON.stringify(ellipsed, null, 2)}

          Evaluate each example and decide if it's relevant and helpful for the user's request.
          Focus on the description field of each example to understand what the code does.
          
          IMPORTANT: Your response must be a valid JSON array containing only the IDs of relevant examples.
          Example format: ["1", "3", "5"]

          If none of the examples are relevant, return an empty array: []
        `,
        model,
      });

      try {
        // Extract just the JSON array from the response (remove any extra text)
        const jsonMatch = resp.text.match(/\[.*\]/s);

        if (jsonMatch) {
          const selectedIds = JSON.parse(jsonMatch[0]) as string[];
          return examples.filter((ex) => selectedIds.includes(String(ex.id)));
        } else {
          // If no JSON array pattern is found, try parsing the entire response
          const parsedIds = JSON.parse(resp.text) as string[];
          return examples.filter((ex) => parsedIds.includes(String(ex.id)));
        }
      } catch (error) {
        logger.error('Failed to parse filtered examples JSON', error);
        // Return a subset of examples if parsing fails
        return examples.slice(0, 2);
      }
    } catch (error) {
      logger.error('Error filtering examples:', error);
      return examples.slice(0, 2); // Return first 2 examples as fallback
    }
  }
}
