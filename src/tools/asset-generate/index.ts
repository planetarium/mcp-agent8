import { ImageAssetGeneratorTool } from './image/image-generation.js';
import {
  CinematicAssetGeneratorTool,
  CinematicAssetResultTool,
  CinematicStatusTool,
} from './cinematic/cinematic-generation.js';
import {
  MusicGeneratorTool,
  SoundEffectsGeneratorTool,
  AudioStatusTool,
  AudioResultTool,
} from './audio/index.js';
import {
  SkyboxGeneratorTool,
  SkyboxStatusTool,
  SkyboxStylesTool,
} from './skybox/skybox-generation.js';
import { AssetWaitTool } from './common/wait-tool.js';

// Comprehensive asset generation tools collection
export const assetGenerateTools = [
  // Static image generation tools
  new ImageAssetGeneratorTool(),

  // Cinematic generation tools
  new CinematicAssetGeneratorTool(),
  new CinematicAssetResultTool(),
  new CinematicStatusTool(),

  // Audio generation tools
  new MusicGeneratorTool(),
  new SoundEffectsGeneratorTool(),
  new AudioStatusTool(),
  new AudioResultTool(),

  // Skybox generation tools
  new SkyboxGeneratorTool(),
  new SkyboxStatusTool(),
  new SkyboxStylesTool(),

  // Shared tools
  new AssetWaitTool(),
];

// Export individual tools
export {
  // Static image related
  ImageAssetGeneratorTool,

  // Cinematic related
  CinematicAssetGeneratorTool,
  CinematicAssetResultTool,
  CinematicStatusTool,

  // Audio related
  MusicGeneratorTool,
  SoundEffectsGeneratorTool,
  AudioStatusTool,
  AudioResultTool,

  // Skybox related
  SkyboxGeneratorTool,
  SkyboxStatusTool,
  SkyboxStylesTool,

  // Shared tools
  AssetWaitTool,
};
