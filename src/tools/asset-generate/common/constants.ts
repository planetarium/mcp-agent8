// Common fal.ai API endpoints
export const FAL_BASE_URL = 'https://fal.ai/api';
export const FAL_QUEUE_URL = 'https://queue.fal.run';
export const FAL_DIRECT_URL = 'https://fal.run';
export const FAL_REST_URL = 'https://rest.alpha.fal.ai';

// Timeout settings
export const DEFAULT_TIMEOUT = 30000; // ms
export const AUTHENTICATED_TIMEOUT = 300000; // ms - longer timeout for asset generation (5 minutes)

// API key environment variable
export const API_KEY_ENV_VAR = 'FAL_KEY';

// Static image related constants
export const DEFAULT_STATIC_API_ENDPOINT = 'fal-ai/recraft-v3';
export const DEFAULT_STATIC_WIDTH = 128;
export const DEFAULT_STATIC_HEIGHT = 128;

// Cinematic related constants
export const DEFAULT_CINEMATIC_MODEL = 'fal-ai/sd-turbo';
export const DEFAULT_CINEMATIC_RESOLUTION = '1280x720';
export const DEFAULT_CINEMATIC_DURATION = 5; // seconds

// Common style list with recraft-v3 supported styles only
export const SUPPORTED_STYLES = [
  'realistic', // Realistic style - maps to 'realistic_image'
  'pixel', // Pixel art style - maps to 'digital_illustration/pixel_art'
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
  'tile', // Tilemap elements
  'icon', // Icons
];
