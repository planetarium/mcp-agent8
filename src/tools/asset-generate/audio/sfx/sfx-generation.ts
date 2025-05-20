import { ToolExecutionContext, ToolCategory, ToolMetadata } from '../../../types.js';
import { AudioGeneratorBase } from '../audio-generator.js';
import { sanitizeAPIParameters } from '../../common/utils.js';
import { queueSubmit } from '../../common/queue-utils.js';
import {
  DEFAULT_SFX_API_ENDPOINT,
  DEFAULT_AUDIO_DURATION,
} from '../../common/constants.js';
import { logger } from '../../../../utils/logging.js';

/**
 * Sound Effects Generator Tool
 *
 * Generates sound effects based on text prompts.
 */
export class SoundEffectsGeneratorTool extends AudioGeneratorBase {
  name = 'sfx_generate';
  description = `Generates realistic sound effects based on text prompts.

This tool helps developers create custom sound effects for games, videos, or any audio-requiring application.

[WHEN TO USE]
Use this tool when you need to:
1. Create sound effects for game actions and events
2. Generate environmental and ambient sounds
3. Produce foley and interaction sounds
4. Create notification and UI feedback sounds
5. Simulate specific audio scenarios

[IMPORTANT NOTE]
- This tool ONLY SUBMITS the generation request and returns a request_id - it does not wait for generation to complete
- After receiving the request_id, you MUST follow this workflow:
  1. Use 'audio_wait' tool to wait 5 seconds
  2. Use 'audio_status' tool with the request_id to check generation status
  3. If status shows 'COMPLETED', use 'audio_result' tool to get the final URL
  4. If status is not 'COMPLETED', wait again and check status until complete
- Sound effect generation typically takes 5-15 seconds to complete depending on duration
- For music tracks and longer compositions, please use the 'music_generate' tool instead
- For visual assets, use appropriate tools like 'image_asset_generate' or 'skybox_generate'
- IMPORTANT: Prompts MUST be written in English only. The API does not support other languages, and non-English prompts may result in errors or unexpected results.

[KEY FEATURES]
- Generates high-quality SFX up to 30 seconds long
- Creates realistic sound effects in just 1 second of processing time
- Professional consistency with no breaks or artifacts
- Results delivered as WAV files

[TIPS FOR BEST RESULTS]
- Write all prompts in English only
- Be specific about the sound you want to create
- Include environmental context if relevant
- Describe the sound's intensity, duration, and character
- Consider how the sound will fit with other audio in your game
- Keep descriptions clear and focused on the specific sound needed`;

  // Tool metadata for categorization and filtering
  metadata: ToolMetadata = {
    categories: [
      ToolCategory.ASSET_GENERATION,
      ToolCategory.AUDIO_GENERATION
    ]
  };

  inputSchema = {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'Detailed description of the sound effect to generate (must be in English)',
      },
      duration: {
        type: 'number',
        description: 'Duration of the sound effect in seconds (1-30, integer values only)',
        default: DEFAULT_AUDIO_DURATION,
      },
    },
    required: ['prompt'],
  };

  protected sanitizeAudioArgs(args: Record<string, unknown>): Record<string, unknown> {
    const duration = args.duration || DEFAULT_AUDIO_DURATION;
    if (!Number.isInteger(duration) || duration < 1 || duration > 30) {
      throw new Error('Duration must be an integer between 1 and 30 seconds.');
    }
    return {
      prompt: args.prompt,
      duration: duration,
    };
  }

  protected getAudioEndpoint(): string {
    return DEFAULT_SFX_API_ENDPOINT;
  }

  protected getAudioType(): string {
    return 'sound effect';
  }

  protected async generateAsset(
    args: Record<string, unknown>,
    apiEndpoint: string,
    context: ToolExecutionContext
  ): Promise<unknown> {
    const { progressCallback } = context;

    // Prepare request parameters
    const parameters = {
      prompt: args.prompt,
      duration: args.duration,
    };

    // Sanitize parameters
    const sanitizedParams = sanitizeAPIParameters(parameters);

    // Update progress
    if (progressCallback) {
      await progressCallback({
        progress: 0.3,
        total: 1,
        message: `Submitting sound effect generation request: "${String(args.prompt).substring(0, 30)}..."`,
      });
    }

    try {
      // Submit the request to queue instead of making direct API call
      const result = await queueSubmit(apiEndpoint, sanitizedParams);

      // Extract request ID
      const requestId = result.request_id;

      if (!requestId) {
        throw new Error('No request ID returned from queue submission');
      }

      // Update progress
      if (progressCallback) {
        await progressCallback({
          progress: 0.8,
          total: 1,
          message: 'Sound effect generation request submitted to queue successfully',
        });
      }

      // Return the request ID and other relevant information
      return {
        request_id: requestId,
        model: apiEndpoint,
        message: `Sound effect generation request submitted to queue. IMPORTANT: This is just the request submission, not the final result. Please follow up with:
1. Use audio_wait tool with 5 seconds wait time
2. Use audio_status tool with request_id: ${requestId} to check status
3. When status is COMPLETED, use audio_result tool to get the final URL`,
      };
    } catch (error) {
      logger.error('Failed to submit sound effect generation request:', error);
      throw new Error(`Failed to submit sound effect generation request: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
