import { CodeExampleSearchTool } from './code-examples.js';
import { GameResourceSearchTool } from './game-resources.js';

// Collection of vector search tools
export const vectorSearchTools = [
  new CodeExampleSearchTool(),
  new GameResourceSearchTool()
];

// Export individual tools
export {
  CodeExampleSearchTool,
  GameResourceSearchTool
}; 