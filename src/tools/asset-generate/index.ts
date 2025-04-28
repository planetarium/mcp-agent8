import { ImageAssetGeneratorTool } from './image/image-generation.js';
import {
  CinematicAssetGeneratorTool,
  CinematicAssetResultTool,
  CinematicStatusTool,
  CinematicWaitTool,
} from './cinematic/cinematic-generation.js';
import {
  MusicGeneratorTool,
  SoundEffectsGeneratorTool,
  AudioStatusTool,
  AudioResultTool,
  AudioWaitTool,
} from './audio/index.js';
import {
  SkyboxGeneratorTool,
  SkyboxStatusTool,
  SkyboxWaitTool,
  SkyboxStylesTool,
} from './skybox/skybox-generation.js';

// Comprehensive asset generation tools collection
export const assetGenerateTools = [
  // Static image generation tools
  new ImageAssetGeneratorTool(),

  // Cinematic generation tools
  new CinematicAssetGeneratorTool(),
  new CinematicAssetResultTool(),
  new CinematicStatusTool(),
  new CinematicWaitTool(),

  // Audio generation tools
  new MusicGeneratorTool(),
  new SoundEffectsGeneratorTool(),
  new AudioStatusTool(),
  new AudioResultTool(),
  new AudioWaitTool(),

  // Skybox generation tools
  new SkyboxGeneratorTool(),
  new SkyboxStatusTool(),
  new SkyboxWaitTool(),
  new SkyboxStylesTool(),
];

// Export individual tools
export {
  // Static image related
  ImageAssetGeneratorTool,

  // Cinematic related
  CinematicAssetGeneratorTool,
  CinematicAssetResultTool,
  CinematicStatusTool,
  CinematicWaitTool,

  // Audio related
  MusicGeneratorTool,
  SoundEffectsGeneratorTool,
  AudioStatusTool,
  AudioResultTool,
  AudioWaitTool,

  // Skybox related
  SkyboxGeneratorTool,
  SkyboxStatusTool,
  SkyboxWaitTool,
  SkyboxStylesTool,
};
