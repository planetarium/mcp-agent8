import { Tool, ToolExecutionContext, ToolResult } from '../types.js';
import { publicRequest } from './utils.js';
import { FAL_BASE_URL } from './constants.js';
import { logger } from '../../utils/logging.js';

/**
 * Cinematic Models List Tool
 *
 * Lists available models that can be used for cinematic generation.
 */
export class CinematicModelsListTool implements Tool {
  name = 'cinematic_models_list';
  description =
    'Lists available AI models that can be used for cinematic generation. Use this tool to discover models suitable for different cinematic styles, resolutions, and quality levels.';

  inputSchema = {
    type: 'object',
    properties: {
      page: {
        type: 'number',
        description: 'The page number of models to retrieve',
      },
      total: {
        type: 'number',
        description: 'The total number of models to retrieve per page',
      },
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async execute(args: Record<string, any>, context: ToolExecutionContext): Promise<ToolResult> {
    const supportedModels = [
      {
        name: 'fal-ai/vidu/reference-to-video',
        description:
          'Vidu Reference to Video creates videos by using a reference images and combining them with a prompt.',
      },
    ];

    return {
      content: [{ type: 'text', text: JSON.stringify(supportedModels) }],
      isError: false,
    };
  }
}

/**
 * Cinematic Models Search Tool
 *
 * Searches for models that can be used for cinematic generation based on keywords.
 */
export class CinematicModelsSearchTool implements Tool {
  name = 'cinematic_models_search';
  description =
    'Searches for models that can be used for cinematic generation based on keywords. Use this tool to find specialized models for particular cinematic styles or requirements.';

  inputSchema = {
    type: 'object',
    properties: {
      keywords: {
        type: 'string',
        description:
          'Keywords to search for models, such as "animation", "realistic", "fantasy", etc.',
      },
    },
    required: ['keywords'],
  };

  async execute(args: Record<string, any>, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const keywords = `${args.keywords},cinematic`;
      const url = `${FAL_BASE_URL}/models?keywords=${encodeURIComponent(keywords)}`;

      // Update progress
      if (context.progressCallback) {
        await context.progressCallback({
          progress: 0.5,
          total: 1,
          message: `Searching for cinematic models matching: ${args.keywords}`,
        });
      }

      const result = await publicRequest(url);

      // Format results to highlight cinematic capabilities
      const enhancedResult = this.enhanceSearchResults(result, args.keywords);

      // Report completion
      if (context.progressCallback) {
        await context.progressCallback({
          progress: 1,
          total: 1,
          message: `Cinematic models search completed`,
        });
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(enhancedResult) }],
        isError: false,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to search cinematic models:', error);
      return {
        content: [{ type: 'text', text: `Error: ${errorMessage}` }],
        isError: true,
      };
    }
  }

  // Enhance search results with cinematic-specific information
  private enhanceSearchResults(results: any, keywords: string): any {
    if (!results.models) {
      return results;
    }

    // Add cinematic relevance score
    const enhancedModels = results.models.map((model: any) => {
      return {
        ...model,
        cinematic_relevance: this.calculateCinematicRelevance(model, keywords),
      };
    });

    // Sort by cinematic relevance
    enhancedModels.sort((a: any, b: any) => b.cinematic_relevance - a.cinematic_relevance);

    return {
      ...results,
      models: enhancedModels,
    };
  }

  // Calculate model relevance for cinematics based on keywords
  private calculateCinematicRelevance(model: any, keywords: string): number {
    const name = (model.name || '').toLowerCase();
    const description = (model.description || '').toLowerCase();
    const keywordList = keywords.toLowerCase().split(',');

    let score = 0;

    // Check for cinematic keywords in name and description
    keywordList.forEach((keyword) => {
      if (name.includes(keyword.trim())) score += 2;
      if (description.includes(keyword.trim())) score += 1;
    });

    // Bonus for video generation capability
    if (name.includes('video') || description.includes('video')) {
      score += 3;
    }

    // Bonus for animation capability
    if (name.includes('animation') || description.includes('animation')) {
      score += 2;
    }

    return score;
  }
}

/**
 * Cinematic Model Schema Tool
 *
 * Gets the schema for a specific model to understand its parameters for cinematic generation.
 */
export class CinematicModelSchemaTool implements Tool {
  name = 'cinematic_model_schema';
  description =
    'Retrieves the detailed schema for a specific cinematic generation model. This helps understand the parameters and capabilities of the model for advanced cinematic creation.';

  inputSchema = {
    type: 'object',
    properties: {
      model_id: {
        type: 'string',
        description: 'The ID of the model to get the schema for (e.g., "fal-ai/sd-turbo")',
      },
    },
    required: ['model_id'],
  };

  async execute(args: Record<string, any>, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const modelId = args.model_id;
      const url = `${FAL_BASE_URL}/openapi/queue/openapi.json?endpoint_id=${encodeURIComponent(modelId)}`;

      // Update progress
      if (context.progressCallback) {
        await context.progressCallback({
          progress: 0.5,
          total: 1,
          message: `Fetching schema for model: ${modelId}`,
        });
      }

      const result = await publicRequest(url);

      // Enhance schema with cinematic-specific information
      const enhancedSchema = this.enhanceSchemaForCinematics(result);

      // Report completion
      if (context.progressCallback) {
        await context.progressCallback({
          progress: 1,
          total: 1,
          message: `Schema fetched successfully for model: ${modelId}`,
        });
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(enhancedSchema) }],
        isError: false,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to get cinematic model schema:', error);
      return {
        content: [{ type: 'text', text: `Error: ${errorMessage}` }],
        isError: true,
      };
    }
  }

  // Enhance schema with cinematic-specific information
  private enhanceSchemaForCinematics(schema: any): any {
    // If not a valid schema, return as is
    if (!schema.paths || !schema.components) {
      return schema;
    }

    try {
      // Add cinematic usage examples if it's a compatible model
      if (this.isCinematicCompatible(schema)) {
        return {
          ...schema,
          cinematic_usage: {
            examples: this.getCinematicExamples(schema),
            recommended_parameters: this.getRecommendedParameters(schema),
          },
        };
      }
    } catch (error) {
      logger.warn('Error enhancing schema for cinematics:', error);
    }

    return schema;
  }

  // Check if the model is compatible with cinematic generation
  private isCinematicCompatible(schema: any): boolean {
    // Check for video or image generation capabilities
    const hasVideoParams = JSON.stringify(schema).toLowerCase().includes('video');
    const hasImageParams = JSON.stringify(schema).toLowerCase().includes('image');
    const hasAnimationParams = JSON.stringify(schema).toLowerCase().includes('animation');

    return hasVideoParams || hasImageParams || hasAnimationParams;
  }

  // Get example usage for cinematic generation
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private getCinematicExamples(schema: any): any[] {
    // Ignore schema parameter for now, return static examples
    return [
      {
        title: 'Basic cinematic scene',
        parameters: {
          prompt: 'A medieval knight standing on a hill overlooking a fantasy kingdom at sunset',
          style: 'realistic',
          duration: 5,
          resolution: '1280x720',
        },
      },
      {
        title: 'Action cinematic with camera movement',
        parameters: {
          prompt: 'Spaceship flying through an asteroid field, dramatic lighting, action scene',
          style: 'sci-fi',
          duration: 8,
          resolution: '1920x1080',
          camera_motion: 'tracking shot',
        },
      },
    ];
  }

  // Get recommended parameters for cinematic generation
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private getRecommendedParameters(schema: any): Record<string, any> {
    // Ignore schema parameter for now, return static recommendations
    return {
      prompt: 'Detailed description of the cinematic scene',
      style: 'One of: realistic, stylized, cartoon, anime, etc.',
      duration: 'Length in seconds (3-15 recommended)',
      resolution: 'Width x height (1280x720 or 1920x1080 recommended)',
      negative_prompt: 'Elements to avoid in the generation',
    };
  }
}
