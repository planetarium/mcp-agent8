// fal.ai API endpoints and constants for cinematic generation
export const FAL_BASE_URL = 'https://fal.ai/api';
export const FAL_QUEUE_URL = 'https://queue.fal.run';
export const FAL_DIRECT_URL = 'https://fal.run';
export const FAL_REST_URL = 'https://rest.alpha.fal.ai';

export const DEFAULT_TIMEOUT = 30000; // ms
export const AUTHENTICATED_TIMEOUT = 300000; // ms - longer timeout for cinematic generation (5 minutes)

export const API_KEY_ENV_VAR = 'FAL_KEY';

// Cinematic generation constants
export const DEFAULT_CINEMATIC_MODEL = 'fal-ai/sd-turbo'; // Default model for cinematic generation
export const DEFAULT_RESOLUTION = '1280x720'; // Default resolution for cinematics
export const DEFAULT_DURATION = 5; // Default duration in seconds
export const SUPPORTED_STYLES = [
  'realistic',
  'stylized',
  'cartoon',
  'pixelart',
  'anime',
  'noir',
  'cyberpunk',
  'fantasy',
]; // Supported cinematic styles
