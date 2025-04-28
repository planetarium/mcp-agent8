import { ToolExecutionContext } from '../../types.js';
import {
  authenticatedRequest,
  sanitizeAPIParameters,
  generateStaticAssetPrompt,
  mapToRecraftStyle,
} from '../common/utils.js';
import {
  FAL_DIRECT_URL,
  DEFAULT_STATIC_API_ENDPOINT,
  DEFAULT_STATIC_WIDTH,
  DEFAULT_STATIC_HEIGHT,
  TOOL_TYPE_IMAGE_GENERATION_2D,
} from '../common/constants.js';
import { AssetGeneratorBase } from '../common/types.js';
import { uploadAssetToServer } from '../common/utils.js';
import { logger } from '../../../utils/logging.js';

/**
 * Game 2D Image Asset Generator Tool
 *
 * Generates 2D assets for game development.
 * Utilizes fal.ai API to help game developers easily create various 2D assets
 * for characters, items, backgrounds, UI elements, and more.
 */
export class ImageAssetGeneratorTool extends AssetGeneratorBase {
  name = 'image_asset_generate';
  description = `Generates 2D image assets for game development.

This tool helps game developers quickly create 2D assets for their games.

[WHEN TO USE]
Use this tool when you need to:
1. Create character sprites
2. Generate game item images
3. Create game background images
4. Design UI elements or icons
5. Generate tilemap elements

[IMPORTANT NOTE]
- This tool is specifically designed for 2D game assets and images.
- For creating immersive 360° environments or skyboxes for VR/AR applications, please use the 'skybox_generate' tool instead.

[KEY FEATURES]
- Creates 2D assets based on detailed descriptions
- Supports various styles (pixel art, cartoon, vector, fantasy, etc.)
- Provides optimized generation parameters for different asset types
- Outputs in formats compatible with game engines

[TIPS FOR BEST RESULTS]
- Provide specific and detailed descriptions of the desired asset
- Specify the desired style clearly (e.g., pixel art, cartoon)
- Set appropriate asset dimensions (default: 128x128)
- Include game type information (platformer, shooter, etc.)
- Always adhere to the schema constraints for style, assetType, and gameType parameters`;

  inputSchema = {
    type: 'object',
    properties: {
      description: {
        type: 'string',
        description:
          'Detailed description of the asset to generate. More specific descriptions yield better results.',
      },
      style: {
        type: 'string',
        description: 'Asset style. Must be one of: pixel art, cartoon, vector, realistic, fantasy, or retro.',
        default: 'pixel art',
      },
      assetType: {
        type: 'string',
        description: 'Asset type. Must be one of: character, item, background, ui, tilemap, or icon.',
        default: 'character',
      },
      width: {
        type: 'number',
        description: 'Asset width in pixels',
        default: DEFAULT_STATIC_WIDTH,
      },
      height: {
        type: 'number',
        description: 'Asset height in pixels',
        default: DEFAULT_STATIC_HEIGHT,
      },
      gameType: {
        type: 'string',
        description: 'Game type to help with generation. Must be one of: platformer, shooter, rpg, puzzle, strategy, arcade, or simulation.',
        default: 'platformer',
      },
      additionalPrompt: {
        type: 'string',
        description: 'Additional prompt information to fine-tune the generation result.',
      },
    },
    required: ['description'],
  };

  protected sanitizeToolArgs(args: Record<string, unknown>): Record<string, unknown> {
    return {
      description: args.description,
      style: args.style || 'pixel art',
      assetType: args.assetType || 'character',
      width: args.width || DEFAULT_STATIC_WIDTH,
      height: args.height || DEFAULT_STATIC_HEIGHT,
      gameType: args.gameType,
      additionalPrompt: args.additionalPrompt,
    };
  }

  protected getApiEndpoint(): string {
    // Use default API endpoint
    return DEFAULT_STATIC_API_ENDPOINT;
  }

  protected async generateAsset(
    args: Record<string, unknown>,
    apiEndpoint: string,
    context: ToolExecutionContext
  ): Promise<Record<string, unknown>> {
    const style = args.style as string;
    const width = args.width as number;
    const height = args.height as number;

    // Generate asset prompt
    const prompt = generateStaticAssetPrompt({
      description: args.description as string,
      style: style,
      assetType: args.assetType as string,
      gameType: args.gameType as string,
      additionalPrompt: args.additionalPrompt as string | undefined,
    });

    // Map to recraft-v3 style format
    const recraftStyle = mapToRecraftStyle(style);

    // Set API parameters for recraft-v3
    const parameters = {
      prompt: prompt,
      image_size: {
        width: width,
        height: height,
      },
      style: recraftStyle,
    };

    const sanitizedParams = sanitizeAPIParameters(parameters);

    // Update progress
    if (context.progressCallback) {
      await context.progressCallback({
        progress: 0.3,
        total: 1,
        message: `Generating ${style} style ${args.assetType || 'asset'}... (${width}x${height})`,
      });
    }

    // Execute model using the API endpoint
    const url = `${FAL_DIRECT_URL}/${apiEndpoint}`;
    const result = await authenticatedRequest(url, 'POST', sanitizedParams);

    // Check for image URL in the result
    let imageUrl = '';
    if (result.images && result.images.length > 0 && result.images[0].url) {
      imageUrl = result.images[0].url;
    } else {
      throw new Error('Expected image URL not found in result format');
    }

    // Update progress
    if (context.progressCallback) {
      await context.progressCallback({
        progress: 0.7,
        total: 1,
        message: 'Uploading generated image to server...',
      });
    }

    // Upload to server if we have a URL
    if (imageUrl) {
      const uploadedAsset = await uploadAssetToServer(
        imageUrl,
        `image-${args.assetType || 'character'}`
      );

      if (uploadedAsset.success && uploadedAsset.url) {
        // Add the uploaded URL to the original result
        result.agent8_url = uploadedAsset.url;

        // Update progress
        if (context.progressCallback) {
          await context.progressCallback({
            progress: 0.9,
            total: 1,
            message: 'Image successfully uploaded to server',
          });
        }
      } else {
        // Log upload failure
        logger.warn(`Failed to upload image asset to server: ${uploadedAsset.error}`);
        throw new Error(`Failed to upload image asset to server: ${uploadedAsset.error}`);
      }
    } else {
      logger.warn('Expected image URL not found in result format');
      throw new Error('Expected image URL not found in result format');
    }

    // Return an object containing only the uploaded asset's URL
    return {
      url: result.agent8_url || null,
      message: result.agent8_url
        ? 'Asset successfully generated and uploaded to server'
        : 'Asset generated but upload to server failed',
    };
  }

  protected getToolType(): string {
    return TOOL_TYPE_IMAGE_GENERATION_2D;
  }
}
