// Common fal.ai API endpoints
export const FAL_BASE_URL = 'https://fal.ai/api';
export const FAL_QUEUE_URL = 'https://queue.fal.run';
export const FAL_DIRECT_URL = 'https://fal.run';
export const FAL_REST_URL = 'https://rest.alpha.fal.ai';

// Timeout settings
export const DEFAULT_TIMEOUT = 30000; // ms
export const AUTHENTICATED_TIMEOUT = 600000; // ms - longer timeout for asset generation (10 minutes)

// API key environment variable
export const API_KEY_ENV_VAR = 'FAL_KEY';

// Tool types for credit consumption
export const TOOL_TYPE_IMAGE_GENERATION_2D = 'imageGeneration2D';
export const TOOL_TYPE_VIDEO_GENERATION = 'videoGeneration';
export const TOOL_TYPE_AUDIO_GENERATION = 'audioGeneration';

// Static image related constants
export const DEFAULT_STATIC_API_ENDPOINT = 'fal-ai/recraft-v3';
export const DEFAULT_STATIC_WIDTH = 128;
export const DEFAULT_STATIC_HEIGHT = 128;

// Audio related constants
export const DEFAULT_MUSIC_API_ENDPOINT = 'CassetteAI/music-generator';
export const DEFAULT_SFX_API_ENDPOINT = 'CassetteAI/sound-effects-generator';
export const DEFAULT_AUDIO_DURATION = 30; // seconds

// Common style list with recraft-v3 supported styles only
export const SUPPORTED_STYLES = [
  'realistic', // Realistic style - maps to 'realistic_image'
  'pixel art', // Pixel art style - maps to 'digital_illustration/pixel_art'
  'vector', // Vector graphic style - maps to 'vector_illustration'
  'cartoon', // Cartoon style - maps to 'digital_illustration/hand_drawn'
  'noir', // Noir style - maps to 'digital_illustration/noir'
];

// Static asset types
export const SUPPORTED_STATIC_TYPES = [
  'character', // Character sprites
  'item', // Items/objects
  'background', // Background images
  'ui', // UI elements
  'tilemap', // Tilemap elements
  'icon', // Icons
];
