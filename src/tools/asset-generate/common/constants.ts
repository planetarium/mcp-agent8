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
export const DEFAULT_STATIC_WIDTH = 512;
export const DEFAULT_STATIC_HEIGHT = 512;

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

// Enhanced asset types for game development
export const GAME_ASSET_TYPES = {
  // Basic types
  CHARACTER: 'character' as const,
  ITEM: 'item' as const,
  BACKGROUND: 'background' as const,
  TILEMAP: 'tilemap' as const,

  // UI types
  UI_ICON: 'ui_icon' as const,
  UI_BUTTON: 'ui_button' as const,
  UI_FRAME: 'ui_frame' as const,

  // Effect types
  FX_PARTICLE: 'fx_particle' as const,
  FX_FLASH: 'fx_flash' as const,
} as const;

export type GameAssetType = typeof GAME_ASSET_TYPES[keyof typeof GAME_ASSET_TYPES];

// Static asset types
export const SUPPORTED_STATIC_TYPES = [
  // Basic Types
  GAME_ASSET_TYPES.CHARACTER,
  GAME_ASSET_TYPES.ITEM,
  GAME_ASSET_TYPES.BACKGROUND,
  GAME_ASSET_TYPES.TILEMAP,

  // UI Elements
  GAME_ASSET_TYPES.UI_ICON,
  GAME_ASSET_TYPES.UI_BUTTON,
  GAME_ASSET_TYPES.UI_FRAME,

  // Visual Effects
  GAME_ASSET_TYPES.FX_PARTICLE,
  GAME_ASSET_TYPES.FX_FLASH
] as const;

// Background removal API endpoint
export const BACKGROUND_REMOVAL_API_ENDPOINT = 'fal-ai/bria/background/remove';

// Background removal settings
export const CHROMA_KEY_MAGENTA = '#FF00FF';
export const BACKGROUND_PROMPT_MODIFIERS = [
  `solid magenta background (#FF00FF)`,
  "clean edges against background"
];

// Asset type configurations
export const ASSET_TYPE_CONFIGS: Record<GameAssetType, {
  defaultWidth: number;
  defaultHeight: number;
  requiresTransparency: boolean;
  enhanceContrast: boolean;
  promptModifiers: readonly string[];
}> = {
  [GAME_ASSET_TYPES.CHARACTER]: {
    defaultWidth: 512,
    defaultHeight: 512,
    requiresTransparency: true,
    enhanceContrast: true,
    promptModifiers: [
      "clear character silhouette",
      "full body visible",
      "centered pose",
      ...BACKGROUND_PROMPT_MODIFIERS
    ]
  },
  [GAME_ASSET_TYPES.ITEM]: {
    defaultWidth: 256,
    defaultHeight: 256,
    requiresTransparency: true,
    enhanceContrast: true,
    promptModifiers: [
      "isolated item",
      "centered composition",
      "clear details",
      ...BACKGROUND_PROMPT_MODIFIERS
    ]
  },
  [GAME_ASSET_TYPES.BACKGROUND]: {
    defaultWidth: 1024,
    defaultHeight: 1024,
    requiresTransparency: false,
    enhanceContrast: false,
    promptModifiers: [
      "game background",
      "full scene",
      "detailed environment",
      "good depth",
      "balanced composition"
    ]
  },
  [GAME_ASSET_TYPES.TILEMAP]: {
    defaultWidth: 256,
    defaultHeight: 256,
    requiresTransparency: true,
    enhanceContrast: true,
    promptModifiers: [
      "tileable pattern",
      "seamless edges",
      "clear texture",
      ...BACKGROUND_PROMPT_MODIFIERS
    ]
  },
  [GAME_ASSET_TYPES.UI_ICON]: {
    defaultWidth: 512,
    defaultHeight: 512,
    requiresTransparency: true,
    enhanceContrast: true,
    promptModifiers: [
      "game icon",
      "clear silhouette",
      "centered symbol",
      ...BACKGROUND_PROMPT_MODIFIERS
    ]
  },
  [GAME_ASSET_TYPES.UI_BUTTON]: {
    defaultWidth: 512,
    defaultHeight: 128,
    requiresTransparency: true,
    enhanceContrast: true,
    promptModifiers: [
      "game button",
      "clean design",
      "interactive element",
      ...BACKGROUND_PROMPT_MODIFIERS
    ]
  },
  [GAME_ASSET_TYPES.UI_FRAME]: {
    defaultWidth: 512,
    defaultHeight: 512,
    requiresTransparency: true,
    enhanceContrast: false,
    promptModifiers: [
      "UI frame",
      "decorative border",
      "game window frame",
      ...BACKGROUND_PROMPT_MODIFIERS
    ]
  },
  [GAME_ASSET_TYPES.FX_PARTICLE]: {
    defaultWidth: 1024,
    defaultHeight: 1024,
    requiresTransparency: true,
    enhanceContrast: true,
    promptModifiers: [
      "particle effect",
      "energy effect",
      "glowing effect",
      "clear center",
      ...BACKGROUND_PROMPT_MODIFIERS
    ]
  },
  [GAME_ASSET_TYPES.FX_FLASH]: {
    defaultWidth: 1024,
    defaultHeight: 1024,
    requiresTransparency: true,
    enhanceContrast: true,
    promptModifiers: [
      "flash effect",
      "bright light",
      "radial glow",
      "intense center",
      ...BACKGROUND_PROMPT_MODIFIERS
    ]
  }
} as const;
