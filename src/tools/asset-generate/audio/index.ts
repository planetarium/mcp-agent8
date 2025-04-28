/**
 * Audio Generation Tools
 *
 * This module contains tools for audio generation:
 * - Music Generator: Creates music tracks based on text descriptions
 * - Sound Effects Generator: Creates sound effects based on text descriptions
 * - Audio Status: Checks the status of audio generation
 * - Audio Result: Retrieves the result of completed audio generation
 * - Audio Wait: Allows waiting for audio generation to complete
 */

import { MusicGeneratorTool } from './music/music-generation.js';
import { SoundEffectsGeneratorTool } from './sfx/sfx-generation.js';
import { AudioStatusTool, AudioResultTool, AudioWaitTool } from './wait-tools.js';

// Export individual tools
export {
  MusicGeneratorTool,
  SoundEffectsGeneratorTool,
  AudioStatusTool,
  AudioResultTool,
  AudioWaitTool,
};
