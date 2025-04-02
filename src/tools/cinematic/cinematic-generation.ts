import { Tool, ToolExecutionContext, ToolResult } from '../types.js';
import { authenticatedRequest, sanitizeParameters } from './utils.js';
import {
  FAL_QUEUE_URL,
  FAL_DIRECT_URL,
  DEFAULT_CINEMATIC_MODEL,
  DEFAULT_RESOLUTION,
  DEFAULT_DURATION,
} from './constants.js';
import { logger } from '../../utils/logging.js';

/**
 * Game Cinematic Generation Tool
 *
 * Generates high-quality game cinematics based on game context and reference images.
 * Utilizes fal.ai API to help game developers easily create cinematics for storytelling,
 * promotional materials, and in-game cutscenes.
 */
export class GameCinematicGeneratorTool implements Tool {
  name = 'game_cinematic_generate';
  description = `Generates high-quality game cinematics based on game context and reference images.

This tool enables game developers to quickly create high-quality cinematics for storytelling, game trailers, cutscenes, or promotional materials.

[WHEN TO USE]
Use this tool when you need to:
1. Visualize a storyline scene from your game
2. Create a game trailer or teaser video
3. Generate in-game cutscenes or cinematic sequences
4. Produce marketing materials or screenshots
5. Create concept cinematics for game characters or environments

[KEY FEATURES]
- Transforms text-based game context into visual cinematics
- Uses reference images to create consistent cinematics matching your game style
- Supports various styles (realistic, cartoon, pixel art, fantasy, etc.)
- Offers different resolution and duration options
- Outputs in formats compatible with game engines

[TIPS FOR BEST RESULTS]
- Provide specific and detailed game context (setting, mood, characters, main activities)
- Choose reference images that best represent your desired style and game art direction
- Clearly specify desired camera angles, lighting, and color palettes
- Include sufficient references to maintain consistency with your game's actual assets
- ALWAYS check the model schema first using the cinematic_model_schema tool before setting any parameters to ensure compatibility and proper configuration

This tool uses the fal.ai API for image generation and video rendering.`;

  inputSchema = {
    type: 'object',
    properties: {
      model: {
        type: 'string',
        description: 'AI model ID to use. Recommended to use the default unless you are an expert.',
      },
      queue: {
        type: 'boolean',
        description:
          'Whether to use the queue system (default: true). Recommended for longer cinematics.',
      },
      parameters: {
        type: 'object',
        description:
          "Model-specific parameter object. You MUST first check the model schema using the cinematic_model_schema tool before setting parameters. Configure parameters precisely according to each model's requirements and specifications. Setting parameters without checking the schema may result in errors.",
        additionalProperties: true,
      },
    },
    required: ['parameters'],
  };

  async execute(args: Record<string, any>, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      // Set model and queue options
      const model = args.model || DEFAULT_CINEMATIC_MODEL;
      const queue = args.queue !== undefined ? !!args.queue : true;

      // Process parameters - use parameters object provided by the user directly
      const parameters = args.parameters || {};

      // Add default negative_prompt (if not provided by the user)
      const defaultNegativePrompt =
        'low quality, blurry, distorted, broken text, unnatural poses, text, letters';

      // Use parameters as provided by user and add default negative_prompt if needed
      const modelParameters = {
        ...parameters,
        negative_prompt: parameters.negative_prompt || defaultNegativePrompt,
      };

      // The original game context processing logic is not applied

      const sanitizedParams = sanitizeParameters(modelParameters);

      // Update progress
      if (context.progressCallback) {
        await context.progressCallback({
          progress: 0.1,
          total: 1,
          message: `Preparing cinematic generation...`,
        });
      }

      // Execute model
      const url = queue ? `${FAL_QUEUE_URL}/${model}` : `${FAL_DIRECT_URL}/${model}`;

      if (context.progressCallback) {
        // Display style and resolution information if available
        const style = modelParameters.style || 'default';
        const duration = modelParameters.duration || DEFAULT_DURATION;
        const resolution = modelParameters.resolution || DEFAULT_RESOLUTION;

        await context.progressCallback({
          progress: 0.3,
          total: 1,
          message: `Generating ${style} style cinematic... (${duration}s, ${resolution})`,
        });
      }

      const result = await authenticatedRequest(url, 'POST', sanitizedParams);

      if (context.progressCallback) {
        await context.progressCallback({
          progress: 0.9,
          total: 1,
          message: `Cinematic generation complete. Processing results...`,
        });
      }

      // Report completion
      if (context.progressCallback) {
        await context.progressCallback({
          progress: 1,
          total: 1,
          message: `Cinematic generation finished successfully`,
        });
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        isError: false,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to generate cinematic:', error);
      return {
        content: [{ type: 'text', text: `Error: ${errorMessage}` }],
        isError: true,
      };
    }
  }
}

/**
 * Cinematic Result Tool
 *
 * Retrieves the result of a queued cinematic generation request.
 */
export class CinematicResultTool implements Tool {
  name = 'cinematic_result';
  description = `Retrieves the result of a queued cinematic generation request.
  
Use this tool to get the generated cinematic results. When queue processing is complete, the generated cinematic assets (image or video URLs) will be returned.`;

  inputSchema = {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The response URL from a queued request.',
      },
    },
    required: ['url'],
  };

  async execute(args: Record<string, any>, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const url = args.url;

      // Update progress
      if (context.progressCallback) {
        await context.progressCallback({
          progress: 0.5,
          total: 1,
          message: `Fetching cinematic result...`,
        });
      }

      const result = await authenticatedRequest(url);

      // Report completion
      if (context.progressCallback) {
        await context.progressCallback({
          progress: 1,
          total: 1,
          message: `Cinematic result fetched successfully`,
        });
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        isError: false,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to retrieve cinematic result:', error);
      return {
        content: [{ type: 'text', text: `Error: ${errorMessage}` }],
        isError: true,
      };
    }
  }
}

/**
 * Cinematic Status Tool
 *
 * Checks the status of a queued cinematic generation request.
 */
export class CinematicStatusTool implements Tool {
  name = 'cinematic_status';
  description = `Checks the status of a queued cinematic generation request.
  
Use this tool to monitor the progress of cinematic generation. You can obtain information about processing status, estimated completion time, and more.

Note that the status typically doesn't change within 30 seconds. To avoid unnecessary API calls and optimize resource usage, it's recommended to wait at least 30 seconds between status checks.`;

  inputSchema = {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The status URL from a queued request.',
      },
    },
    required: ['url'],
  };

  async execute(args: Record<string, any>, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const url = args.url;

      // Update progress
      if (context.progressCallback) {
        await context.progressCallback({
          progress: 0.5,
          total: 1,
          message: `Checking cinematic status...`,
        });
      }

      const result = await authenticatedRequest(url);

      // Report completion
      if (context.progressCallback) {
        await context.progressCallback({
          progress: 1,
          total: 1,
          message: `Cinematic status checked successfully`,
        });
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        isError: false,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to check cinematic status:', error);
      return {
        content: [{ type: 'text', text: `Error: ${errorMessage}` }],
        isError: true,
      };
    }
  }
}

/**
 * Cinematic Cancel Tool
 *
 * Cancels a queued cinematic generation request.
 */
export class CinematicCancelTool implements Tool {
  name = 'cinematic_cancel';
  description = `Cancels a queued cinematic generation request.
  
Use this tool to stop a long cinematic generation request or to cancel a request submitted with incorrect parameters.`;

  inputSchema = {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The cancel URL from a queued request.',
      },
    },
    required: ['url'],
  };

  async execute(args: Record<string, any>, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const url = args.url;

      // Update progress
      if (context.progressCallback) {
        await context.progressCallback({
          progress: 0.5,
          total: 1,
          message: `Cancelling cinematic request...`,
        });
      }

      const result = await authenticatedRequest(url, 'PUT');

      // Report completion
      if (context.progressCallback) {
        await context.progressCallback({
          progress: 1,
          total: 1,
          message: `Cinematic request cancelled successfully`,
        });
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        isError: false,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to cancel cinematic request:', error);
      return {
        content: [{ type: 'text', text: `Error: ${errorMessage}` }],
        isError: true,
      };
    }
  }
}
