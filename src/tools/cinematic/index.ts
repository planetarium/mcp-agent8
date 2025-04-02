import {
  GameCinematicGeneratorTool,
  CinematicResultTool,
  CinematicStatusTool,
  CinematicCancelTool,
} from './cinematic-generation.js';

import { CinematicModelsListTool, CinematicModelSchemaTool } from './cinematic-models.js';

// Complete set of cinematic tools to replace fal tools
export const cinematicTools = [
  // Generation tools
  new GameCinematicGeneratorTool(),
  new CinematicResultTool(),
  new CinematicStatusTool(),
  new CinematicCancelTool(),

  // Model tools
  new CinematicModelsListTool(),
  new CinematicModelSchemaTool(),

  // Storage tools
  // new CinematicUploadTool()
];

// Export individual tools
export {
  // Generation tools
  GameCinematicGeneratorTool,
  CinematicResultTool,
  CinematicStatusTool,
  CinematicCancelTool,

  // Model tools
  CinematicModelsListTool,
  CinematicModelSchemaTool,
};
