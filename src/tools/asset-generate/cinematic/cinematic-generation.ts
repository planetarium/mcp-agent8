import { ToolExecutionContext } from '../../types.js';
import {
  authenticatedRequest,
  sanitizeParameters,
  enhanceCinematicPrompt,
  uploadAssetToServer,
} from '../common/utils.js';
import { FAL_QUEUE_URL } from '../common/constants.js';
import { AssetGeneratorBase, AssetResultBase } from '../common/types.js';
import { logger } from '../../../utils/logging.js';

/**
 * Game Cinematic Asset Generator Tool
 *
 * Generates high-quality game cinematics based on game context and reference images.
 * Utilizes fal.ai API to help game developers easily create cinematics for storytelling,
 * promotional materials, and in-game cutscenes.
 */
export class CinematicAssetGeneratorTool extends AssetGeneratorBase {
  name = 'cinematic_asset_generate';
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
- Include sufficient references to maintain consistency with your game's actual assets`;

  inputSchema = {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'Text prompt for video generation, max 1500 characters',
        maxLength: 1500,
      },
      aspect_ratio: {
        type: 'string',
        enum: ['16:9', '9:16', '1:1'],
        description: 'The aspect ratio of the output video',
        default: '16:9',
      },
      reference_image_urls: {
        type: 'array',
        items: { type: 'string' },
        description:
          'URLs of the reference images to use for consistent subject appearance. Maximum 3 images allowed.',
        maxItems: 3,
      },
      seed: {
        type: 'integer',
        description: 'Random seed for generation',
      },
      movement_amplitude: {
        type: 'string',
        enum: ['auto', 'small', 'medium', 'large'],
        description: 'The movement amplitude of objects in the frame',
        default: 'auto',
      },
      queue: {
        type: 'boolean',
        description: 'Whether to use the queue system. Always true for this cinematic model.',
        default: true,
      },
    },
    required: ['prompt', 'reference_image_urls'],
  };

  protected sanitizeArgs(args: Record<string, any>): Record<string, any> {
    // Limit reference images to maximum of 3
    const referenceImages = args.reference_image_urls || [];
    if (referenceImages.length > 3) {
      logger.warn(
        'Too many reference images provided. Maximum allowed is 3. Using only the first 3 images.'
      );
    }

    return {
      model: 'fal-ai/vidu/reference-to-video',
      queue: true, // Always use queue for this model
      parameters: {
        prompt: args.prompt,
        aspect_ratio: args.aspect_ratio || '16:9',
        reference_image_urls: referenceImages.slice(0, 3), // Use maximum of 3 images
        seed: args.seed,
        movement_amplitude: args.movement_amplitude || 'auto',
      },
    };
  }

  protected getApiEndpoint(): string {
    // Fixed model for cinematics
    return 'fal-ai/vidu/reference-to-video';
  }

  protected async generateAsset(
    args: Record<string, any>,
    apiEndpoint: string,
    context: ToolExecutionContext
  ): Promise<any> {
    const parameters = args.parameters;

    // Optimize prompt (if provided)
    if (parameters.prompt) {
      parameters.prompt = enhanceCinematicPrompt(parameters.prompt, 'cinematic');
    }

    const sanitizedParams = sanitizeParameters(parameters);

    // Update progress
    if (context.progressCallback) {
      const aspectRatio = parameters.aspect_ratio || '16:9';
      const movementAmplitude = parameters.movement_amplitude || 'auto';

      await context.progressCallback({
        progress: 0.3,
        total: 1,
        message: `Generating cinematic with reference images... (${aspectRatio}, ${movementAmplitude} movement)`,
      });
    }

    // Execute model using the API endpoint
    const url = `${FAL_QUEUE_URL}/${apiEndpoint}`;
    const result = await authenticatedRequest(url, 'POST', sanitizedParams);

    // Check for cinematic asset URLs in the result
    let assetUrls: string[] = [];

    // Extract URLs based on result format and schema
    if (result.video && typeof result.video === 'object' && result.video.url) {
      // Handle vidu/reference-to-video schema format
      assetUrls.push(result.video.url);
    } else if (result.video && typeof result.video === 'string') {
      // Handle string URL format
      assetUrls.push(result.video);
    } else if (result.image && typeof result.image === 'object' && result.image.url) {
      // Handle image object with url property
      assetUrls.push(result.image.url);
    } else if (result.image && typeof result.image === 'string') {
      // Handle string image URL format
      assetUrls.push(result.image);
    } else if (result.videos && result.videos.length > 0) {
      // Handle array of video URLs or objects
      result.videos.forEach((video: any) => {
        if (typeof video === 'object' && video.url) {
          assetUrls.push(video.url);
        } else if (typeof video === 'string') {
          assetUrls.push(video);
        }
      });
    } else if (result.images && result.images.length > 0) {
      // Handle array of image URLs or objects
      result.images.forEach((image: any) => {
        if (typeof image === 'object' && image.url) {
          assetUrls.push(image.url);
        } else if (typeof image === 'string') {
          assetUrls.push(image);
        }
      });
    } else if (typeof result === 'string' && result.startsWith('http')) {
      // Handle direct URL string response
      assetUrls.push(result);
    }

    // Update progress
    if (context.progressCallback) {
      await context.progressCallback({
        progress: 0.7,
        total: 1,
        message: 'Uploading cinematic assets to server...',
      });
    }

    // Store uploaded asset URLs
    const uploadedUrls: { original: string; agent8: string }[] = [];

    // Upload each asset URL to server
    if (assetUrls.length > 0) {
      for (let i = 0; i < assetUrls.length; i++) {
        try {
          const assetUrl = assetUrls[i];

          // Extract file extension from URL or use default value
          let fileExt = '.mp4'; // Default extension (cinematic is usually video)

          // Try to extract extension from URL
          if (assetUrl.includes('?')) {
            // Remove query parameters
            const urlWithoutQuery = assetUrl.split('?')[0];
            if (urlWithoutQuery.match(/\.(mp4|webm|mov|avi|gif|png|jpg|jpeg)$/i)) {
              fileExt = urlWithoutQuery.substring(urlWithoutQuery.lastIndexOf('.'));
            }
          } else if (assetUrl.match(/\.(mp4|webm|mov|avi|gif|png|jpg|jpeg)$/i)) {
            fileExt = assetUrl.substring(assetUrl.lastIndexOf('.'));
          }

          const uploadedAsset = await uploadAssetToServer(
            assetUrl,
            'cinematic',
            `cinematic-${i + 1}-${new Date().getTime()}${fileExt}`
          );

          if (uploadedAsset.success && uploadedAsset.url) {
            uploadedUrls.push({
              original: assetUrl,
              agent8: uploadedAsset.url,
            });
          } else {
            logger.warn(`Failed to upload cinematic asset to server: ${uploadedAsset.error}`);
          }
        } catch (error) {
          logger.error('Error during cinematic asset upload:', error);
        }
      }
    }

    // Add uploaded URLs to the original result
    if (uploadedUrls.length > 0) {
      result.agent8_urls = uploadedUrls;

      // For single URL, also add as primary URL
      if (uploadedUrls.length === 1) {
        result.agent8_url = uploadedUrls[0].agent8;
      }
    }

    // Additional processing progress report
    if (context.progressCallback) {
      await context.progressCallback({
        progress: 0.9,
        total: 1,
        message: 'Cinematic generation and upload completed',
      });
    }

    return result;
  }
}

/**
 * Cinematic Asset Result Tool
 *
 * Retrieves the result of a queued cinematic generation request.
 */
export class CinematicAssetResultTool extends AssetResultBase {
  name = 'cinematic_asset_result';
  description = `Retrieves the result of a queued cinematic generation request.

When queue processing is complete, the generated cinematic assets (image or video URLs) will be returned.`;

  protected async fetchResult(url: string): Promise<any> {
    // Get original result
    const result = await authenticatedRequest(url);

    // Check for cinematic asset URLs in the result
    let assetUrls: string[] = [];

    // Extract URLs based on result format and schema
    if (result.video && typeof result.video === 'object' && result.video.url) {
      // Handle vidu/reference-to-video schema format
      assetUrls.push(result.video.url);
    } else if (result.video && typeof result.video === 'string') {
      // Handle string URL format
      assetUrls.push(result.video);
    } else if (result.image && typeof result.image === 'object' && result.image.url) {
      // Handle image object with url property
      assetUrls.push(result.image.url);
    } else if (result.image && typeof result.image === 'string') {
      // Handle string image URL format
      assetUrls.push(result.image);
    } else if (result.videos && result.videos.length > 0) {
      // Handle array of video URLs or objects
      result.videos.forEach((video: any) => {
        if (typeof video === 'object' && video.url) {
          assetUrls.push(video.url);
        } else if (typeof video === 'string') {
          assetUrls.push(video);
        }
      });
    } else if (result.images && result.images.length > 0) {
      // Handle array of image URLs or objects
      result.images.forEach((image: any) => {
        if (typeof image === 'object' && image.url) {
          assetUrls.push(image.url);
        } else if (typeof image === 'string') {
          assetUrls.push(image);
        }
      });
    } else if (typeof result === 'string' && result.startsWith('http')) {
      // Handle direct URL string response
      assetUrls.push(result);
    }

    // Store uploaded asset URLs
    const uploadedUrls: string[] = [];

    // Upload each asset URL to server
    if (assetUrls.length > 0) {
      for (let i = 0; i < assetUrls.length; i++) {
        try {
          const assetUrl = assetUrls[i];

          // Extract file extension from URL or use default value
          let fileExt = '.mp4'; // Default extension (cinematic is usually video)

          // Try to extract extension from URL
          if (assetUrl.includes('?')) {
            // Remove query parameters
            const urlWithoutQuery = assetUrl.split('?')[0];
            if (urlWithoutQuery.match(/\.(mp4|webm|mov|avi|gif|png|jpg|jpeg)$/i)) {
              fileExt = urlWithoutQuery.substring(urlWithoutQuery.lastIndexOf('.'));
            }
          } else if (assetUrl.match(/\.(mp4|webm|mov|avi|gif|png|jpg|jpeg)$/i)) {
            fileExt = assetUrl.substring(assetUrl.lastIndexOf('.'));
          }

          const uploadedAsset = await uploadAssetToServer(
            assetUrl,
            'cinematic',
            `cinematic-result-${i + 1}-${new Date().getTime()}${fileExt}`
          );

          if (uploadedAsset.success && uploadedAsset.url) {
            uploadedUrls.push(uploadedAsset.url);
          } else {
            logger.warn(`Failed to upload cinematic asset to server: ${uploadedAsset.error}`);
          }
        } catch (error) {
          logger.error('Error during cinematic asset upload:', error);
        }
      }
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(uploadedUrls) }],
      isError: false,
    };
  }

  protected getAssetType(): string {
    return 'cinematic asset';
  }
}

/**
 * Cinematic Status Tool
 *
 * Checks the status of a queued cinematic generation request.
 */
export class CinematicStatusTool {
  name = 'cinematic_status';
  description = `Checks the status of a queued cinematic generation request.

Use this tool to check the current status of a cinematic generation job in the queue. Note that status updates may not be immediate - please allow approximately 30 seconds between status checks for updates to propagate.`;

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

  async execute(args: Record<string, any>, context: ToolExecutionContext): Promise<any> {
    try {
      const url = args.url;

      // Update progress
      if (context.progressCallback) {
        await context.progressCallback({
          progress: 0.5,
          total: 1,
          message: 'Checking cinematic status...',
        });
      }

      const result = await authenticatedRequest(url);

      // Report completion
      if (context.progressCallback) {
        await context.progressCallback({
          progress: 1,
          total: 1,
          message: 'Cinematic status check completed',
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
 * Cinematic Wait Tool
 *
 * A utility tool that allows the LLM to wait a specified amount of time before checking status again.
 */
export class CinematicWaitTool {
  name = 'cinematic_wait';
  description = `Allows waiting for a specified number of seconds before continuing execution.

Use this tool between status checks to give time for cinematic generation to progress.
The recommended wait time is 30 seconds between status checks.`;

  inputSchema = {
    type: 'object',
    properties: {
      seconds: {
        type: 'integer',
        description: 'Number of seconds to wait. Default is 30 seconds.',
        default: 30,
        minimum: 1,
        maximum: 120,
      },
      status_message: {
        type: 'string',
        description: 'Optional status message to display during the wait',
      },
    },
    required: ['seconds'],
  };

  async execute(args: Record<string, any>, context: ToolExecutionContext): Promise<any> {
    try {
      const seconds = args.seconds || 30;
      const statusMessage =
        args.status_message || `Waiting ${seconds} seconds for cinematic generation...`;

      // Limit waiting time to a reasonable amount (between 1 and 120 seconds)
      const waitTime = Math.max(1, Math.min(120, seconds));

      // Initial progress update
      if (context.progressCallback) {
        await context.progressCallback({
          progress: 0,
          total: waitTime,
          message: statusMessage,
        });
      }

      // Wait loop with progress updates
      for (let i = 1; i <= waitTime; i++) {
        // Wait for 1 second
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Update progress every second
        if (context.progressCallback) {
          await context.progressCallback({
            progress: i,
            total: waitTime,
            message: `${statusMessage} (${i}/${waitTime}s)`,
          });
        }
      }

      // Final progress update
      if (context.progressCallback) {
        await context.progressCallback({
          progress: waitTime,
          total: waitTime,
          message: 'Wait completed. You can now check the status again.',
        });
      }

      return {
        content: [
          {
            type: 'text',
            text: `Waited for ${waitTime} seconds. You can now check the status of your cinematic generation.`,
          },
        ],
        isError: false,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to execute wait:', error);
      return {
        content: [{ type: 'text', text: `Error during wait: ${errorMessage}` }],
        isError: true,
      };
    }
  }
}
