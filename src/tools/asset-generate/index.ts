import { StaticAssetGeneratorTool } from './static/static-generation.js';
import {
  CinematicAssetGeneratorTool,
  CinematicAssetResultTool,
  CinematicStatusTool,
} from './cinematic/cinematic-generation.js';
import { AssetGenerateModelsListTool, AssetGenerateModelSchemaTool } from './common/models.js';

// Asset generation tools collection
export const assetGenerateTools = [
  // Static image generation tools
  new StaticAssetGeneratorTool(),

  // Cinematic generation tools
  new CinematicAssetGeneratorTool(),
  new CinematicAssetResultTool(),
  new CinematicStatusTool(),

  // Model management tools
  new AssetGenerateModelsListTool(),
  new AssetGenerateModelSchemaTool(),
];

// Export individual tools
export {
  // Static image related
  StaticAssetGeneratorTool,

  // Cinematic related
  CinematicAssetGeneratorTool,
  CinematicAssetResultTool,
  CinematicStatusTool,

  // Model management related
  AssetGenerateModelsListTool,
  AssetGenerateModelSchemaTool,
};
