import { ImageAssetGeneratorTool } from './image/image-generation.js';
import {
  CinematicAssetGeneratorTool,
  CinematicAssetResultTool,
  CinematicStatusTool,
  CinematicWaitTool,
} from './cinematic/cinematic-generation.js';

// Asset generation tools collection
export const assetGenerateTools = [
  // Static image generation tools
  new ImageAssetGeneratorTool(),

  // Cinematic generation tools
  new CinematicAssetGeneratorTool(),
  new CinematicAssetResultTool(),
  new CinematicStatusTool(),
  new CinematicWaitTool(),
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
};
