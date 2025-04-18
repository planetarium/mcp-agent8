import axios, { AxiosRequestConfig } from 'axios';
import { logger } from '../../../utils/logging.js';
import {
  API_KEY_ENV_VAR,
  AUTHENTICATED_TIMEOUT,
  SUPPORTED_STYLES,
  SUPPORTED_STATIC_TYPES,
  DEFAULT_TIMEOUT,
} from './constants.js';
import { AssetUploadResponse } from '../types.js';
import { v4 as uuidv4 } from 'uuid';
import FormData from 'form-data';

/**
 * Gets API key from environment
 */
export function getApiKey(): string {
  const apiKey = process.env[API_KEY_ENV_VAR];
  if (!apiKey) {
    throw new Error(`${API_KEY_ENV_VAR} environment variable is not set`);
  }
  return apiKey;
}

/**
 * Makes authenticated request to fal.ai API
 */
export async function authenticatedRequest(url: string, method = 'GET', data?: any): Promise<any> {
  try {
    const config: AxiosRequestConfig = {
      method,
      url,
      headers: { Authorization: `Key ${getApiKey()}` },
      timeout: AUTHENTICATED_TIMEOUT,
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    logger.error('Failed to make API request for asset generation:', error);
    throw error;
  }
}

/**
 * Makes public request to APIs without authentication
 */
export async function publicRequest(url: string, method = 'GET', data?: any): Promise<any> {
  try {
    const config: AxiosRequestConfig = {
      method,
      url,
      timeout: DEFAULT_TIMEOUT,
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    logger.error('Failed to make public API request:', error);
    throw error;
  }
}

/**
 * Sanitizes parameters for API requests
 */
export function sanitizeParameters(parameters: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(parameters).filter(([, v]) => v !== null && v !== undefined)
  );
}

/**
 * Validates style
 */
export function validateStyle(style: string): string {
  const normalizedStyle = style.toLowerCase().trim();

  if (!SUPPORTED_STYLES.includes(normalizedStyle)) {
    logger.warn(`Unsupported style: ${style}. Defaulting to 'pixel art'.`);
    return 'pixel art';
  }

  return normalizedStyle;
}

/**
 * Validates static asset type
 */
export function validateStaticAssetType(assetType: string): string {
  const normalizedType = assetType.toLowerCase().trim();

  if (!SUPPORTED_STATIC_TYPES.includes(normalizedType)) {
    logger.warn(`Unsupported asset type: ${assetType}. Defaulting to 'character'.`);
    return 'character';
  }

  return normalizedType;
}

/**
 * Generates optimized prompt for 2D static assets
 */
export function generateStaticAssetPrompt(params: {
  description: string;
  style: string;
  assetType: string;
  gameType?: string;
  additionalPrompt?: string;
}): string {
  const { description, style, assetType, gameType, additionalPrompt } = params;

  // Validate style and asset type
  const validatedStyle = validateStyle(style);
  const validatedAssetType = validateStaticAssetType(assetType);

  // Build base prompt
  let prompt = `2D ${validatedStyle} style ${validatedAssetType} for a game: ${description}`;

  // Style-specific optimizations
  if (validatedStyle === 'pixel art') {
    prompt += ', pixel art, pixel perfect, pixelated, clean pixel edges, limited color palette';
  } else if (validatedStyle === 'cartoon') {
    prompt += ', cartoon style, vibrant colors, clean outlines, flat design';
  } else if (validatedStyle === 'vector') {
    prompt += ', vector art, clean lines, scalable graphic, minimalist design';
  } else if (validatedStyle === 'realistic') {
    prompt += ', realistic style, detailed, high quality, game asset';
  } else if (validatedStyle === 'fantasy') {
    prompt += ', fantasy style, magical, medieval, fantasy game art';
  } else if (validatedStyle === 'retro') {
    prompt += ', retro game, old school, vintage gaming, classic game';
  }

  // Asset type-specific optimizations (pixel style)
  if (validatedStyle === 'pixel art' && validatedAssetType === 'character') {
    prompt += ', character sprite, game sprite, flat design, 2D character';
  } else if (validatedStyle === 'pixel art' && validatedAssetType === 'item') {
    prompt += ', game item, collectible, power-up, game object';
  } else if (validatedStyle === 'pixel art' && validatedAssetType === 'background') {
    prompt += ', game background, seamless pattern, tileable';
  } else if (validatedStyle === 'pixel art' && validatedAssetType === 'tilemap') {
    prompt += ', game tile, seamless tile, tileset, tilemap element';
  } else if (validatedStyle === 'pixel art' && validatedAssetType === 'ui') {
    prompt += ', game interface, UI element, menu item, button';
  } else if (validatedStyle === 'pixel art' && validatedAssetType === 'icon') {
    prompt += ', game icon, skill icon, menu icon, small icon';
  }

  // Game type-specific optimizations
  if (gameType) {
    if (gameType.toLowerCase().includes('platformer')) {
      prompt += ', side view, platformer game, 2D platformer';
    } else if (gameType.toLowerCase().includes('shooter')) {
      prompt += ', top-down view, shooter game';
    } else if (gameType.toLowerCase().includes('rpg')) {
      prompt += ', RPG game, role-playing game';
    } else if (gameType.toLowerCase().includes('puzzle')) {
      prompt += ', puzzle game, bright colors';
    }

    prompt += `, ${gameType} game style`;
  }

  // Additional prompt information
  if (additionalPrompt) {
    prompt += `, ${additionalPrompt}`;
  }

  return prompt;
}

/**
 * Enhances prompt for cinematic generation
 */
export function enhanceCinematicPrompt(prompt: string, style?: string): string {
  const validatedStyle = style ? validateStyle(style) : 'realistic';

  // Enhance base prompt
  let enhancedPrompt = prompt;

  // Style-specific optimizations
  if (validatedStyle === 'realistic') {
    enhancedPrompt += ', photorealistic, high quality, detailed, 4k, cinematic lighting';
  } else if (validatedStyle === 'stylized') {
    enhancedPrompt += ', stylized, artistic, vibrant colors, exaggerated features';
  } else if (validatedStyle === 'cartoon') {
    enhancedPrompt += ', cartoon style, bright colors, simple shapes, clean outlines';
  } else if (validatedStyle === 'pixelart') {
    enhancedPrompt += ', pixel art, pixel perfect, 16-bit style, retro game aesthetic';
  } else if (validatedStyle === 'anime') {
    enhancedPrompt += ', anime style, manga inspired, cel shaded, Japanese animation';
  } else if (validatedStyle === 'noir') {
    enhancedPrompt += ', film noir, high contrast, dramatic shadows, moody lighting';
  } else if (validatedStyle === 'cyberpunk') {
    enhancedPrompt += ', cyberpunk, neon lights, futuristic, high tech, low life';
  } else if (validatedStyle === 'fantasy') {
    enhancedPrompt += ', fantasy, magical, mystical, epic, high fantasy';
  }

  return enhancedPrompt;
}

/**
 * Uploads asset to Agent8 server
 * @param assetUrl - URL of the asset generated by fal.ai or a data URL
 * @param assetType - Type of asset (static, cinematic, etc.)
 * @param fileName - Optional custom file name (defaults to UUID)
 * @returns Object with success status and either URL or error message
 */
export async function uploadAssetToServer(
  assetUrl: string,
  assetType: string,
  fileName?: string
): Promise<AssetUploadResponse> {
  try {
    if (!assetUrl) {
      throw new Error('Missing required asset URL');
    }

    let fileData: Buffer;
    let contentType: string | undefined;

    // Handle data URL (e.g., data:image/png;base64,...)
    if (assetUrl.startsWith('data:')) {
      const matches = assetUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        throw new Error('Invalid data URL format');
      }
      contentType = matches[1];
      fileData = Buffer.from(matches[2], 'base64');
    } else {
      // Handle regular URL - download the file
      const assetResponse = await axios({
        method: 'GET',
        url: assetUrl,
        responseType: 'arraybuffer',
        timeout: AUTHENTICATED_TIMEOUT,
      });
      contentType = assetResponse.headers['content-type'];
      fileData = Buffer.from(assetResponse.data);
    }

    // Get file extension from content type or URL
    let fileExt = '.png'; // Default extension

    if (contentType) {
      if (contentType.includes('image/jpeg') || contentType.includes('image/jpg')) {
        fileExt = '.jpg';
      } else if (contentType.includes('image/png')) {
        fileExt = '.png';
      } else if (contentType.includes('image/gif')) {
        fileExt = '.gif';
      } else if (contentType.includes('video/mp4')) {
        fileExt = '.mp4';
      } else if (contentType.includes('video/webm')) {
        fileExt = '.webm';
      }
    }

    // Generate unique filename if not provided
    const uniqueFileName = fileName || `${assetType}-${uuidv4().slice(0, 16)}${fileExt}`;

    // Set path based on asset type
    const path = assetType.toLowerCase().includes('cinematic') ? 'cinematics' : 'static-assets';

    // Set verse (game identifier)
    const verse = 'mcp-agent8-generated';

    // Create form data for file upload
    const formData = new FormData();
    formData.append('file', fileData, {
      filename: uniqueFileName,
      contentType: contentType || 'application/octet-stream',
    });
    formData.append('path', path);

    const endpoint = 'https://verse8-simple-game-backend-609824224664.asia-northeast3.run.app';
    const signature = 'bolt-verse-signature';

    try {
      const uploadResponse = await axios.post(`${endpoint}/verses/${verse}/files`, formData, {
        headers: {
          'X-Signature': signature,
          ...formData.getHeaders(), // Important for form-data to work correctly
        },
        timeout: AUTHENTICATED_TIMEOUT,
      });

      // Check if the request was successful
      if (uploadResponse.status >= 200 && uploadResponse.status < 300) {
        // Generate the asset URL
        const assetServerUrl = `https://agent8-games.verse8.io/${verse}/${path}/${uniqueFileName}`;

        logger.info(`Asset successfully uploaded to server: ${assetServerUrl}`);

        return {
          success: true,
          url: assetServerUrl,
        };
      } else {
        throw new Error(
          `Upload failed: ${uploadResponse.status} ${JSON.stringify(uploadResponse.data)}`
        );
      }
    } catch (uploadError: any) {
      // Handle upload error
      const errorMessage = uploadError.response
        ? `Upload failed: ${uploadError.response.status} ${JSON.stringify(uploadError.response.data)}`
        : `Upload error: ${uploadError.message}`;

      logger.error(errorMessage);
      throw new Error(errorMessage);
    }
  } catch (error: any) {
    logger.error('Error uploading asset to server:', error);
    return {
      success: false,
      error: error.message || 'Unknown error during upload',
    };
  }
}

/**
 * Maps our style values to recraft-v3 style values
 */
export function mapToRecraftStyle(style: string): string {
  const normalizedStyle = style.toLowerCase().trim();

  switch (normalizedStyle) {
    case 'realistic':
      return 'realistic_image';
    case 'pixel art':
      return 'digital_illustration/pixel_art';
    case 'vector':
      return 'vector_illustration';
    case 'cartoon':
      return 'digital_illustration/hand_drawn';
    case 'noir':
      return 'digital_illustration/noir';
    default:
      logger.warn(`Unsupported style for recraft-v3: ${style}. Defaulting to 'realistic_image'.`);
      return 'realistic_image';
  }
}
