import { Tool, ToolExecutionContext, ToolResult } from '../../types.js';
import { logger } from '../../../utils/logging.js';
import { FAL_BASE_URL } from './constants.js';
import { publicRequest } from './utils.js';

/**
 * Asset Generation Models List Tool
 *
 * Lists available models that can be used for game asset generation (static or cinematic).
 */
export class AssetGenerateModelsListTool implements Tool {
  name = 'asset_generate_models_list';
  description = `Lists available AI models that can be used for game asset generation.

This tool provides a list of available models for generating either static assets or cinematics for game development.

[WHEN TO USE]
Use this tool when you need to:
1. Discover available models for generating game assets
2. Understand capabilities of different asset generation models
3. Find models suitable for specific asset types or styles`;

  inputSchema = {
    type: 'object',
    properties: {
      assetType: {
        type: 'string',
        description: 'Type of assets to list models for. Can be "static", "cinematic", or "all"',
        default: 'all',
      },
      page: {
        type: 'number',
        description: 'The page number of models to retrieve',
        default: 1,
      },
      total: {
        type: 'number',
        description: 'The total number of models to retrieve per page',
        default: 10,
      },
    },
  };

  async execute(args: Record<string, any>, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      // Parse arguments
      const assetType = (args.assetType || 'all').toLowerCase();

      // Update progress
      if (context.progressCallback) {
        await context.progressCallback({
          progress: 0.3,
          total: 1,
          message: `Retrieving ${assetType} asset generation models...`,
        });
      }

      // Get supported models based on asset type
      const supportedModels = this.getSupportedModels(assetType);

      // Report completion
      if (context.progressCallback) {
        await context.progressCallback({
          progress: 1,
          total: 1,
          message: `Retrieved ${supportedModels.length} ${assetType} asset generation models`,
        });
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(supportedModels) }],
        isError: false,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to list asset generation models:', error);
      return {
        content: [{ type: 'text', text: `Error: ${errorMessage}` }],
        isError: true,
      };
    }
  }

  getSupportedModels(assetType: string): any[] {
    // Static-specific models
    const staticModels = [
      {
        id: 'stability-ai/pixelart-xl-sdxl-1.0',
        name: 'PixelArt XL',
        description:
          'Specialized model for generating pixel art game assets with consistent style.',
        assetTypes: ['static'],
        staticFeatures: [
          'pixel character',
          'pixel item',
          'tileset',
          'pixel background',
          'sprite sheet',
        ],
      },
      {
        id: 'fal-ai/fast-turbo-diffusion',
        name: 'Fast Turbo Diffusion',
        description: 'Very fast image generation model for rapid asset prototyping.',
        assetTypes: ['static'],
        staticFeatures: ['character', 'item', 'background', 'ui', 'concept'],
      },
    ];

    // Cinematic-specific models
    const cinematicModels = [
      {
        id: 'fal-ai/vidu/reference-to-video',
        name: 'Vidu Reference to Video',
        description: 'Creates videos by using reference images and combining them with a prompt.',
        assetTypes: ['cinematic'],
        cinematicFeatures: ['character animation', 'environment flythrough', 'cutscene', 'trailer'],
      },
    ];

    // Return models based on requested asset type
    if (assetType === 'static') {
      return [...staticModels];
    } else if (assetType === 'cinematic') {
      return [...cinematicModels];
    } else {
      // Return all models
      return [...staticModels, ...cinematicModels];
    }
  }
}

/**
 * Asset Generation Model Schema Tool
 *
 * Gets the schema for a specific model to understand its parameters for asset generation.
 */
export class AssetGenerateModelSchemaTool implements Tool {
  name = 'asset_generate_model_schema';
  description = `Retrieves the detailed schema for a specific asset generation model.

This tool helps understand the parameters and capabilities of models used for game asset generation, including both static assets and cinematics.

[WHEN TO USE]
Use this tool when you need to:
1. Understand the exact parameters required by a specific model
2. Configure advanced generation settings for detailed control
3. Explore model capabilities and optimal configuration
4. Prepare for using the asset_generate or cinematic_generate tools`;

  inputSchema = {
    type: 'object',
    properties: {
      model_id: {
        type: 'string',
        description:
          'The ID of the model to get the schema for (e.g., "stabilityai/sd-turbo", "fal-ai/vidu/reference-to-video")',
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
          progress: 0.3,
          total: 1,
          message: `Fetching schema for model: ${modelId}`,
        });
      }

      // Fetch schema from API
      const result = await publicRequest(url);

      // Report completion
      if (context.progressCallback) {
        await context.progressCallback({
          progress: 1,
          total: 1,
          message: `Schema fetched successfully for model: ${modelId}`,
        });
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        isError: false,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to get asset generation model schema:', error);
      return {
        content: [{ type: 'text', text: `Error: ${errorMessage}` }],
        isError: true,
      };
    }
  }
}
