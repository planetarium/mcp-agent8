import { ToolExecutionContext, ToolResult } from '../../types.js';
import {
  authenticatedRequest,
  sanitizeAPIParameters,
  enhanceCinematicPrompt,
  uploadAssetToServer,
} from '../common/utils.js';
import { FAL_QUEUE_URL, TOOL_TYPE_VIDEO_GENERATION } from '../common/constants.js';
import { AssetGeneratorBase, AssetResultBase } from '../common/asset-generator.js';
import { logger } from '../../../utils/logging.js';
import { Tool, ToolCategory, ToolMetadata } from '../../types.js';

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
- Include sufficient references to maintain consistency with your game's actual assets

[VEO3 PROMPT TIPS]
- Veo3 is used when no reference images are provided
- Keep prompts short (one or two sentences) and focus on a single scene
- Mention subject, style, camera angle, movement and lighting
- Include quoted dialogue to add subtitles in the video
- Avoid very long lists of styles or conflicting instructions
- Provide reference images for consistent characters or settings
- See Google's video prompt guide: https://cloud.google.com/vertex-ai/generative-ai/docs/video/video-gen-prompt-guide`;

  // Tool metadata for categorization and filtering
  metadata: ToolMetadata = {
    categories: [
      ToolCategory.ASSET_GENERATION,
      ToolCategory.CINEMATIC_GENERATION
    ]
  };

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
    required: ['prompt'],
  };

  protected sanitizeToolArgs(args: Record<string, unknown>): Record<string, unknown> {
    // Limit reference images to maximum of 3
    let referenceImages = Array.isArray(args.reference_image_urls)
      ? (args.reference_image_urls as string[])
      : [];
    if (referenceImages.length > 3) {
      logger.warn(
        'Too many reference images provided. Maximum allowed is 3. Using only the first 3 images.'
      );
    }

    // Map 3D files (glb/gltf/vrm) to flowkit conversion URL
    referenceImages = referenceImages.slice(0, 3).map((url: string) => {
      if (url.match(/\.(glb|gltf|vrm)(\?.*)?$/i)) {
        return `https://www.flowkit.app/s/demo/r/${url}`;
      }
      return url;
    });

    const hasReference = referenceImages.length > 0;

    return {
      model: hasReference ? 'fal-ai/vidu/reference-to-video' : 'fal-ai/veo3',
      queue: true, // Both models currently use queue processing
      parameters: {
        prompt: args.prompt,
        aspect_ratio:
          typeof args.aspect_ratio === 'string' ? args.aspect_ratio : '16:9',
        ...(hasReference && { reference_image_urls: referenceImages }),
        seed: args.seed,
        movement_amplitude:
          typeof args.movement_amplitude === 'string'
            ? args.movement_amplitude
            : 'auto',
      },
    };
  }

  protected getApiEndpoint(args: Record<string, unknown>): string {
    const parameters = (args.parameters as Record<string, unknown>) || {};
    const referenceImages = Array.isArray(parameters.reference_image_urls)
      ? (parameters.reference_image_urls as string[])
      : [];
    return referenceImages.length > 0
      ? 'fal-ai/vidu/reference-to-video'
      : 'fal-ai/veo3';
  }

  protected async generateAsset(
    args: Record<string, unknown>,
    apiEndpoint: string,
    context: ToolExecutionContext
  ): Promise<unknown> {
    const parameters = (args.parameters as Record<string, unknown>) || {};

    // Optimize prompt (if provided)
    if (typeof parameters.prompt === 'string') {
      parameters.prompt = enhanceCinematicPrompt(parameters.prompt, 'cinematic');
    }

    const sanitizedParams = sanitizeAPIParameters(parameters);

    // Update progress
    if (context.progressCallback) {
      const aspectRatio =
        typeof parameters.aspect_ratio === 'string'
          ? parameters.aspect_ratio
          : '16:9';
      const movementAmplitude =
        typeof parameters.movement_amplitude === 'string'
          ? parameters.movement_amplitude
          : 'auto';

      const hasReference = Array.isArray(parameters.reference_image_urls) &&
        (parameters.reference_image_urls as unknown[]).length > 0;
      await context.progressCallback({
        progress: 0.3,
        total: 1,
        message: hasReference
          ? `Generating cinematic with reference images... (${aspectRatio}, ${movementAmplitude} movement)`
          : `Generating cinematic from prompt... (${aspectRatio}, ${movementAmplitude} movement)`,
      });
    }

    // Execute model using the API endpoint
    const url = `${FAL_QUEUE_URL}/${apiEndpoint}`;
    const result = await authenticatedRequest(url, 'POST', sanitizedParams);

    // Check for cinematic asset URLs in the result
    let assetUrls: string[] = [];

    // Extract URLs based on result format and schema
    if (
      result.video &&
      typeof result.video === 'object' &&
      result.video !== null &&
      'url' in result.video &&
      typeof (result.video as { url?: unknown }).url === 'string'
    ) {
      // Handle vidu/reference-to-video schema format
      assetUrls.push((result.video as { url: string }).url);
    } else if (typeof result.video === 'string') {
      // Handle string URL format
      assetUrls.push(result.video);
    } else if (
      result.image &&
      typeof result.image === 'object' &&
      result.image !== null &&
      'url' in result.image &&
      typeof (result.image as { url?: unknown }).url === 'string'
    ) {
      // Handle image object with url property
      assetUrls.push((result.image as { url: string }).url);
    } else if (typeof result.image === 'string') {
      // Handle string image URL format
      assetUrls.push(result.image);
    } else if (Array.isArray(result.videos) && result.videos.length > 0) {
      // Handle array of video URLs or objects
      result.videos.forEach((video: unknown) => {
        if (video && typeof video === 'object' && 'url' in video && typeof video.url === 'string') {
          assetUrls.push(video.url);
        } else if (typeof video === 'string') {
          assetUrls.push(video);
        }
      });
    } else if (Array.isArray(result.images) && result.images.length > 0) {
      // Handle array of image URLs or objects
      result.images.forEach((image: unknown) => {
        if (image && typeof image === 'object' && 'url' in image && typeof image.url === 'string') {
          assetUrls.push(image.url);
        } else if (typeof image === 'string') {
          assetUrls.push(image);
        }
      });
    } else if (typeof result === 'string' && (result as string).startsWith('http')) {
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

  protected getToolType(): string {
    return TOOL_TYPE_VIDEO_GENERATION;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected getToolUsageCount(args: Record<string, unknown>): number {
    return 1;
  }

  protected getToolUsageDescription(args: Record<string, unknown>): string {
    const parameters = (args.parameters as Record<string, unknown>) || {};
    const aspectRatio =
      typeof parameters.aspect_ratio === 'string' ? parameters.aspect_ratio : '16:9';
    const prompt = typeof parameters.prompt === 'string' ? parameters.prompt : '';
    return `Cinematic video generation: "${prompt.substring(0, 30)}..." (${aspectRatio})`;
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

  // Tool metadata for categorization and filtering
  metadata: ToolMetadata = {
    categories: [
      ToolCategory.ASSET_GENERATION,
      ToolCategory.CINEMATIC_GENERATION
    ]
  };

  protected async fetchResult(url: string): Promise<unknown> {
    // Get original result
    const result = await authenticatedRequest(url, 'GET');

    // Check for cinematic asset URLs in the result
    let assetUrls: string[] = [];

    // Extract URLs based on result format and schema
    if (
      result.video &&
      typeof result.video === 'object' &&
      result.video !== null &&
      'url' in result.video &&
      typeof (result.video as { url?: unknown }).url === 'string'
    ) {
      // Handle vidu/reference-to-video schema format
      assetUrls.push((result.video as { url: string }).url);
    } else if (typeof result.video === 'string') {
      // Handle string URL format
      assetUrls.push(result.video);
    } else if (
      result.image &&
      typeof result.image === 'object' &&
      result.image !== null &&
      'url' in result.image &&
      typeof (result.image as { url?: unknown }).url === 'string'
    ) {
      // Handle image object with url property
      assetUrls.push((result.image as { url: string }).url);
    } else if (typeof result.image === 'string') {
      // Handle string image URL format
      assetUrls.push(result.image);
    } else if (Array.isArray(result.videos) && result.videos.length > 0) {
      // Handle array of video URLs or objects
      result.videos.forEach((video: unknown) => {
        if (video && typeof video === 'object' && 'url' in video && typeof video.url === 'string') {
          assetUrls.push(video.url);
        } else if (typeof video === 'string') {
          assetUrls.push(video);
        }
      });
    } else if (Array.isArray(result.images) && result.images.length > 0) {
      // Handle array of image URLs or objects
      result.images.forEach((image: unknown) => {
        if (image && typeof image === 'object' && 'url' in image && typeof image.url === 'string') {
          assetUrls.push(image.url);
        } else if (typeof image === 'string') {
          assetUrls.push(image);
        }
      });
    } else if (typeof result === 'string' && (result as string).startsWith('http')) {
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
export class CinematicStatusTool implements Tool {
  name = 'cinematic_status';
  description = `Checks the status of a queued cinematic generation request.

Use this tool to check the current status of a cinematic generation job in the queue. Note that status updates may not be immediate - please allow approximately 60 seconds between status checks for updates to propagate.`;

  // Tool metadata for categorization and filtering
  metadata: ToolMetadata = {
    categories: [
      ToolCategory.ASSET_GENERATION,
      ToolCategory.CINEMATIC_GENERATION
    ]
  };

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

  async execute(args: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const url = typeof args.url === 'string' ? args.url : String(args.url);

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
