import { embed, generateText, LanguageModel } from 'ai';
import { createOpenAI, OpenAIProvider } from '@ai-sdk/openai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Tool, ToolResult, Example, FileMap } from './types.js';
import { logger } from '../utils/logging.js';
import { env } from '../utils/env.js';

/**
 * Code Example Search Tool
 *
 * Searches a vector database for code examples that match specific requirements
 * extracted from user messages.
 */
export class SearchCodeExamplesTool implements Tool {
  name = 'search_code_examples';
  description = 'Search for code examples from a vector database based on user query';

  // Tool input schema in JSONSchema format
  inputSchema = {
    type: 'object',
    properties: {
      userMessage: {
        type: 'string',
        description: 'The user\'s request to search for code examples',
      },
      summary: {
        type: 'string',
        description: 'Summary of all conversations so far',
      },
    },
    required: ['userMessage', 'summary'],
  };

  /**
   * Execute the vector DB search
   */
  async execute(args: Record<string, any>): Promise<ToolResult> {
    const { summary, userMessage } = args;

    try {
      logger.info('Starting vector DB search');
      
      // Search vector DB
      const result = await this.searchVectorDB({
        userMessage,
        summary,
      });

      // Format the result
      const formattedExamples = this.formatSearchResults(result);

      return {
        content: [
          {
            type: 'text',
            text: formattedExamples,
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
        formatted += `- \`${results[file].content}\`\n`;
      });

      formatted += '\n';
    });

    return formatted;
  }

  /**
   * Search vector database for code examples
   * This method contains the core search logic ported from the provided code
   */
  private async searchVectorDB({
    userMessage,
    summary,
  }: {
    userMessage: string;
    summary: string;
  }): Promise<FileMap> {
    const supabase = createClient(
      env.getRequired('SUPABASE_URL'),
      env.getRequired('SUPABASE_SERVICE_ROLE_KEY')
    );

    const openai = createOpenAI({
      apiKey: env.getRequired('OPENAI_API_KEY'),
    });

    const model = openai.languageModel('o3-mini');

    // Step 1: Extract specific requirements from the user's request
    const requirements = await this.extractRequirements({
      userMessage,
      summary,
      model,
    });

    logger.info(`Extracted ${requirements.length} requirements:`, requirements);

    // Step 2: Search vector database for relevant code examples
    const codeExamples = await this.searchExamplesFromVectorDB({
      requirements,
      supabase,
      openai,
    });

    logger.info(`Found ${codeExamples.length} code examples`);

    // Step 3: Filter and evaluate the relevance of found examples
    const relevantExamples = await this.filterRelevantExamples({
      requirements,
      examples: codeExamples,
      userMessage,
      summary,
      model,
    });

    logger.info(`Selected ${relevantExamples.length} relevant examples`);

    // Step 4: Format and return relevant examples
    const result: FileMap = {};

    // Format examples as virtual files to be consistent with the current API
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

    return result;
  }

  /**
   * Extracts concrete requirements from a user's request to search for code examples
   * Simplified version of the original function
   */
  private async extractRequirements(props: {
    userMessage: string;
    summary: string;
    model: LanguageModel;
  }) {
    const { userMessage, summary, model } = props;

    try {
      const resp = await generateText({
        system: `
          You are an AI assistant that helps developers by extracting specific coding requirements from general requests.
          Your task is to analyze a user's request and identify concrete technical implementation requirements 
          that would benefit from code examples.
        `,
        prompt: `
          Here is the summary of the conversation so far:
          ${summary}

          User's request: "${userMessage}"

          Extract 1-10 specific technical implementation requirements from this request.
          Focus on aspects that might benefit from existing code examples, especially complex or difficult-to-implement features.
          
          Format your response as a JSON array of strings, with each string being a specific requirement:
          ["requirement 1", "requirement 2", "requirement 3", ...]

          IMPORTANT: Return an empty array if no requirements are found.
          IMPORTANT: All requirements must be in English.
        `,
        model,
      });

      try {
        // Extract just the JSON array from the response (remove any extra text)
        const jsonMatch = resp.text.match(/\[.*\]/s);

        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as string[];
        } else {
          return JSON.parse(resp.text) as string[];
        }
      } catch (error) {
        logger.error('Failed to parse requirements JSON', error);

        // Fall back to a simple extraction approach
        const lines = resp.text
          .split('\n')
          .filter((line) => line.trim().startsWith('-') || line.trim().startsWith('*'))
          .map((line) => line.replace(/^[-*]\s+/, '').trim());

        return lines.length > 0 ? lines : [userMessage];
      }
    } catch (error) {
      logger.error('Error extracting requirements:', error);
      // Return the user message as a fallback
      return [userMessage];
    }
  }

  /**
   * Search vector database for examples matching requirements
   */
  private async searchExamplesFromVectorDB({
    requirements,
    supabase,
    openai,
  }: {
    requirements: string[];
    supabase: SupabaseClient;
    openai: OpenAIProvider;
  }): Promise<Example[]> {
    const results: Example[] = [];
    const seenIds = new Set<string>();

    // Search for each requirement
    for (const requirement of requirements) {
      try {
        const { embedding } = await embed({
          model: openai.embedding('text-embedding-ada-002'),
          value: requirement,
        });

        const { data, error } = await supabase.rpc('match_codebase', {
          query_embedding: embedding,
          match_count: 5,
        });

        if (error) {
          logger.error(`Vector search error for "${requirement}":`, error);
          continue;
        }

        if (data && data.length > 0) {
          // Only add items that haven't been seen before
          for (const item of data) {
            if (!seenIds.has(item.id)) {
              seenIds.add(item.id);
              results.push({
                ...item,
                requirement,
              });
            }
          }
        }
      } catch (error) {
        logger.error(`Error searching for "${requirement}":`, error);
      }
    }

    return results;
  }

  /**
   * Filter and evaluate the usefulness of code examples for the current request
   */
  private async filterRelevantExamples(props: {
    requirements: string[];
    examples: Example[];
    userMessage: string;
    summary: string;
    model: LanguageModel;
  }): Promise<Example[]> {
    const { requirements, examples, userMessage, summary, model } = props;

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
          Here is the summary of the conversation so far:
          ${summary}

          User's request: "${userMessage}"

          Requirements extracted from the request:
          ${requirements.map((req) => `- ${req}`).join('\n')}

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
