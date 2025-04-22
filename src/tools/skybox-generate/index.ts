import { SkyboxGeneratorTool, SkyboxStatusTool, SkyboxWaitTool, SkyboxStylesTool } from './skybox-generation.js';

// Skybox generation tools collection
export const skyboxGenerateTools = [
  new SkyboxGeneratorTool(),
  new SkyboxStatusTool(),
  new SkyboxWaitTool(),
  new SkyboxStylesTool(),
];

// Export individual tools
export {
  SkyboxGeneratorTool,
  SkyboxStatusTool,
  SkyboxWaitTool,
  SkyboxStylesTool,
};