import { SkyboxGeneratorTool, SkyboxStatusTool, SkyboxWaitTool } from './skybox-generation.js';

// Skybox generation tools collection
export const skyboxGenerateTools = [
  new SkyboxGeneratorTool(),
  new SkyboxStatusTool(),
  new SkyboxWaitTool(),
];

// Export individual tools
export {
  SkyboxGeneratorTool,
  SkyboxStatusTool,
  SkyboxWaitTool,
};