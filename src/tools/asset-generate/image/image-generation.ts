import { ToolExecutionContext, ToolCategory, ToolMetadata } from '../../types.js';
import {
  authenticatedRequest,
  sanitizeAPIParameters,
  generateStaticAssetPrompt,
  mapToRecraftStyle,
} from '../common/utils.js';
import {
  FAL_DIRECT_URL,
  DEFAULT_STATIC_API_ENDPOINT,
  BACKGROUND_REMOVAL_API_ENDPOINT,
  GAME_ASSET_TYPES,
  ASSET_TYPE_CONFIGS,
  TOOL_TYPE_IMAGE_GENERATION_2D,
  CHROMA_KEY_MAGENTA,
  GameAssetType,
  DEFAULT_STATIC_WIDTH,
  DEFAULT_STATIC_HEIGHT,
} from '../common/constants.js';
import { AssetGeneratorBase } from '../common/asset-generator.js';
import { uploadAssetToServer } from '../common/utils.js';
import { logger } from '../../../utils/logging.js';

interface ImageGenerationResponse {
  images?: Array<{
    url: string;
  }>;
}

interface BackgroundRemovalResponse {
  image?: {
    url: string;
  };
}

/**
 * Game 2D Image Asset Generator Tool
 *
 * Generates 2D assets for game development.
 * Utilizes fal.ai API to help game developers easily create various 2D assets
 * for characters, items, backgrounds, UI elements, and more.
 *
 * Enhanced features:
 * - Automatic background removal for transparent assets
 * - Asset-type specific optimizations
 * - Advanced UI and effect asset support
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
6. Create particle and effect assets

[SUPPORTED ASSET TYPES]
Basic Types:
- Characters (sprites, avatars)
- Items (objects, collectibles)
- Backgrounds (scenes, environments)
- Tilemaps (terrain, platforms)

UI Types:
- Icons (skills, items, status)
- Buttons (menus, actions)
- Frames (windows, panels)

Effect Types:
- Particles (magic, explosions)
- Flash Effects (impacts, highlights)

[KEY FEATURES]
- Creates 2D assets based on detailed descriptions
- Supports various styles: pixel art, cartoon (western/Disney style), anime (Japanese animation style), vector, fantasy, realistic, retro, etc.
- "cartoon" and "anime" are clearly distinguished. "cartoon" refers to western/Disney style, while "anime" refers to Japanese animation style.
- Automatic background removal for transparent assets
- Asset-type specific optimizations
- Outputs in formats compatible with game engines

[TIPS FOR BEST RESULTS]
1. Asset Description Tips:
   - Provide clear, specific descriptions of what you want
   - Include details about pose, expression, or state for characters
   - Specify materials, colors, and textures for items
   - Describe lighting and atmosphere for backgrounds
   - Mention any special effects or glows needed

2. Style Guidelines:
   - Choose a style that matches your game's aesthetic
   - For pixel art: specify pixel dimensions and color limitations
   - For vector art: mention if you need sharp edges or gradients
   - For realistic style: describe the level of detail needed
   - For cartoon style: specify if you want western/Disney style
   - For anime style: specify if you want Japanese animation style, and describe character features (e.g. big eyes, cel shading)
   - For fantasy/retro: describe the era or fantasy elements

3. Size Recommendations:
   - Characters: 512x512px for main characters
   - Items: 256x256px for collectibles and equipment
   - UI Elements: 512x128px for buttons, 512x512px for frames
   - Effects: 1024x1024px for particles and flashes
   - Backgrounds: 1024x1024px or larger for scenes

4. Technical Considerations:
   - Consider the final asset placement in your game
   - Request transparent backgrounds when needed
   - Specify if the asset needs to be tileable
   - Mention any animation requirements
   - Consider platform/engine specific requirements

5. Context Matters:
   - Describe how the asset will be used in the game
   - Mention the viewing distance/scale in the game
   - Specify any color schemes to match your game
   - Consider how it fits with existing assets
   - Think about performance requirements`;

  metadata: ToolMetadata = {
    categories: [
      ToolCategory.ASSET_GENERATION,
      ToolCategory.IMAGE_GENERATION
    ]
  };

  inputSchema = {
    type: 'object',
    properties: {
      description: {
        type: 'string',
        description: 'Detailed description of the asset to generate. More specific descriptions yield better results.',
      },
      style: {
        type: 'string',
        description: 'Asset style. Must be one of: pixel art, cartoon, anime, vector, realistic, fantasy, or retro. "cartoon" is for western/Disney style, "anime" is for Japanese animation style.',
        default: 'pixel art',
        enum: ['pixel art', 'cartoon', 'anime', 'vector', 'realistic', 'fantasy', 'retro'],
      },
      assetType: {
        type: 'string',
        description: 'Asset type. Supports both basic types (character, item, background, etc.) and enhanced types (ui_icon, fx_particle, etc.).',
        default: 'character',
      },
      width: {
        type: 'number',
        description: 'Asset width in pixels',
      },
      height: {
        type: 'number',
        description: 'Asset height in pixels',
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
      model: {
        type: 'string',
        description: 'Image generation model to use. "auto" will select the best model for the chosen style. "recraft-v3" for vector/UI/icon, "hidream-i1" for concept art, anime, detailed raster images.',
        default: 'auto',
        enum: ['auto', 'recraft-v3', 'hidream-i1'],
      },
    },
    required: ['description'],
  };

  // Style to model mapping for auto selection
  private static readonly STYLE_MODEL_MAP: Record<string, string> = {
    'pixel art': 'recraft-v3',
    'cartoon': 'recraft-v3',
    'anime': 'hidream-i1',
    'vector': 'recraft-v3',
    'realistic': 'recraft-v3',
    'fantasy': 'hidream-i1',
    'retro': 'recraft-v3',
  };

  private async removeBackground(imageUrl: string): Promise<string> {
    try {
      const url = `${FAL_DIRECT_URL}/${BACKGROUND_REMOVAL_API_ENDPOINT}`;
      const result = await authenticatedRequest(url, 'POST', {
        image_url: imageUrl,
        format: 'png',
        remove_color: CHROMA_KEY_MAGENTA
      }) as BackgroundRemovalResponse;

      if (!result.image?.url) {
        throw new Error('Background removal failed: No image URL in response');
      }

      return result.image.url;
    } catch (error) {
      logger.error('Background removal failed:', error);
      throw error;
    }
  }

  protected sanitizeToolArgs(args: Record<string, unknown>): Record<string, unknown> {
    const assetType = args.assetType as GameAssetType;

    // Check if it's an enhanced asset type
    if (Object.values(GAME_ASSET_TYPES).includes(assetType)) {
      const config = ASSET_TYPE_CONFIGS[assetType];
      return {
        description: args.description,
        style: args.style || 'clean',
        assetType: assetType,
        width: args.width || config.defaultWidth,
        height: args.height || config.defaultHeight,
        gameType: args.gameType,
        additionalPrompt: args.additionalPrompt,
        model: args.model || 'recraft-v3',
      };
    }

    // Handle legacy asset types with default type
    return {
      description: args.description,
      style: args.style || 'pixel art',
      assetType: GAME_ASSET_TYPES.CHARACTER,
      width: args.width || DEFAULT_STATIC_WIDTH,
      height: args.height || DEFAULT_STATIC_HEIGHT,
      gameType: args.gameType,
      additionalPrompt: args.additionalPrompt,
      model: args.model || 'recraft-v3',
    };
  }

  protected getApiEndpoint(args?: Record<string, unknown>): string {
    // Determine model based on style if model is 'auto'
    let model = args?.model as string || 'auto';
    if (model === 'auto') {
      const style = args?.style as string || 'pixel art';
      model = ImageAssetGeneratorTool.STYLE_MODEL_MAP[style] || 'recraft-v3';
    }
    if (model === 'hidream-i1') {
      return 'fal-ai/hidream-i1-full';
    }
    return DEFAULT_STATIC_API_ENDPOINT;
  }

  protected async generateAsset(
    args: Record<string, unknown>,
    apiEndpoint: string,
    context: ToolExecutionContext
  ): Promise<Record<string, unknown>> {
    const assetType = args.assetType as GameAssetType;
    const style = args.style as string;
    const width = args.width as number;
    const height = args.height as number;
    let model = args.model as string || 'auto';

    if (model === 'auto') {
      model = ImageAssetGeneratorTool.STYLE_MODEL_MAP[style] || 'recraft-v3';
    }

    // Check if it's an enhanced asset type
    const isEnhancedType = Object.values(GAME_ASSET_TYPES).includes(assetType);
    const config = isEnhancedType ? ASSET_TYPE_CONFIGS[assetType] : null;

    // Generate optimized prompt
    const prompt = generateStaticAssetPrompt({
      description: args.description as string,
      style: style,
      assetType: assetType,
      gameType: args.gameType as string,
      additionalPrompt: args.additionalPrompt as string,
    });

    // Initial generation progress
    if (context.progressCallback) {
      await context.progressCallback({
        progress: 0.3,
        total: 1,
        message: `Generating ${style} style ${assetType}... (${width}x${height})`,
      });
    }

    // 모델별 파라미터 분기
    let requestParams: any;
    if (model === 'hidream-i1') {
      requestParams = {
        prompt,
        image_size: { width, height },
        num_inference_steps: 50,
        guidance_scale: 5,
        num_images: 1,
        enable_safety_checker: true,
        output_format: 'png',
        // Add negative_prompt, etc. if needed
      };
    } else {
      requestParams = {
        prompt,
        image_size: { width, height },
        style: mapToRecraftStyle(style),
      };
    }

    // Generate initial image
    const url = `${FAL_DIRECT_URL}/${apiEndpoint}`;
    const result = await authenticatedRequest(url, 'POST', sanitizeAPIParameters(requestParams)) as ImageGenerationResponse;

    let imageUrl = result.images?.[0]?.url;
    if (!imageUrl) {
      throw new Error('Image generation failed: No image URL in response');
    }

    // Background removal for enhanced types that require it
    if (config?.requiresTransparency) {
      if (context.progressCallback) {
        await context.progressCallback({
          progress: 0.6,
          total: 1,
          message: 'Removing background...',
        });
      }
      imageUrl = await this.removeBackground(imageUrl);
    }

    // Upload to server
    if (context.progressCallback) {
      await context.progressCallback({
        progress: 0.8,
        total: 1,
        message: 'Uploading processed image...',
      });
    }

    const uploadedAsset = await uploadAssetToServer(
      imageUrl,
      `${assetType}`,
      `${assetType}-${Date.now()}.png`
    );

    if (!uploadedAsset.success || !uploadedAsset.url) {
      throw new Error(`Upload failed: ${uploadedAsset.error || 'Unknown error'}`);
    }

    return {
      url: uploadedAsset.url,
      message: 'Asset successfully generated and processed',
      assetType: assetType,
      style: style,
      dimensions: { width, height }
    };
  }

  protected getToolType(): string {
    return TOOL_TYPE_IMAGE_GENERATION_2D;
  }

  protected getToolUsageCount(): number {
    return 1;
  }

  protected getToolUsageDescription(args: Record<string, unknown>): string {
    const style = args.style as string || 'pixel art';
    const assetType = args.assetType as string || 'character';
    return `2D ${style} ${assetType} image generation: "${String(args.description).substring(0, 30)}..."`;
  }
}
