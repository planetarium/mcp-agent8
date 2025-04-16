import { StaticAssetGeneratorTool } from './static/static-generation.js';
import {
  CinematicAssetGeneratorTool,
  CinematicAssetResultTool,
  CinematicStatusTool,
  CinematicWaitTool,
} from './cinematic/cinematic-generation.js';

// Asset generation tools collection
export const assetGenerateTools = [
  // Static image generation tools
  new StaticAssetGeneratorTool(),

  // Cinematic generation tools
  new CinematicAssetGeneratorTool(),
  new CinematicAssetResultTool(),
  new CinematicStatusTool(),
  new CinematicWaitTool(),
];

// Export individual tools
export {
  // Static image related
  StaticAssetGeneratorTool,

  // Cinematic related
  CinematicAssetGeneratorTool,
  CinematicAssetResultTool,
  CinematicStatusTool,
  CinematicWaitTool,
};
