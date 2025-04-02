import axios, { AxiosRequestConfig } from 'axios';
import { logger } from '../../utils/logging.js';
import { API_KEY_ENV_VAR, AUTHENTICATED_TIMEOUT, SUPPORTED_STYLES, DEFAULT_TIMEOUT } from './constants.js';

// Get API key from environment
export function getApiKey(): string {
  const apiKey = process.env[API_KEY_ENV_VAR];
  if (!apiKey) {
    throw new Error(`${API_KEY_ENV_VAR} environment variable is not set`);
  }
  return apiKey;
}

// Make authenticated request to fal.ai API
export async function authenticatedRequest(url: string, method = 'GET', data?: any): Promise<any> {
  try {
    const config: AxiosRequestConfig = {
      method,
      url,
      headers: { 'Authorization': `Key ${getApiKey()}` },
      timeout: AUTHENTICATED_TIMEOUT,
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    logger.error('Failed to make API request for cinematic generation:', error);
    throw error;
  }
}

// Make public request to fal.ai API
export async function publicRequest(url: string): Promise<any> {
  try {
    const response = await axios.get(url, { timeout: DEFAULT_TIMEOUT });
    return response.data;
  } catch (error) {
    logger.error('Failed to make public request to API:', error);
    throw error;
  }
}

// Sanitize parameters for API requests
export function sanitizeParameters(parameters: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(parameters).filter(([, v]) => v !== null && v !== undefined)
  );
}

// Validate and format game context for the model prompt
export function formatGameContext(gameContext: string): string {
  if (!gameContext || gameContext.trim().length === 0) {
    throw new Error('Game context is required');
  }
  
  // Truncate if context is too long (consider model limits)
  const maxLength = 1000;
  if (gameContext.length > maxLength) {
    logger.warn(`Game context is too long. Truncating to ${maxLength} characters.`);
    return gameContext.substring(0, maxLength) + '...';
  }
  
  return gameContext;
}

// Validate cinematic style
export function validateCinematicStyle(style: string): string {
  const normalizedStyle = style.toLowerCase().trim();
  
  if (!SUPPORTED_STYLES.includes(normalizedStyle)) {
    logger.warn(`Unsupported cinematic style: ${style}. Defaulting to 'realistic'.`);
    return 'realistic';
  }
  
  return normalizedStyle;
}

// Format resolution string to be compatible with the API
export function formatResolution(resolution: string): string {
  // Basic resolution format: "1280x720"
  const resolutionRegex = /^(\d+)x(\d+)$/;
  
  if (!resolutionRegex.test(resolution)) {
    logger.warn(`Invalid resolution format: ${resolution}. Defaulting to '1280x720'.`);
    return '1280x720';
  }
  
  return resolution;
}

// Process reference images array into required format
export function processReferenceImages(images: string[]): string[] {
  if (!images || images.length === 0) {
    return [];
  }
  
  // Validate image URLs
  return images.filter(img => {
    const isValid = img && (img.startsWith('http') || img.startsWith('data:image'));
    if (!isValid) {
      logger.warn(`Invalid image URL ignored: ${img}`);
    }
    return isValid;
  });
} 