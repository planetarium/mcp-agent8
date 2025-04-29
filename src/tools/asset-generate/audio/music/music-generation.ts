import { ToolExecutionContext } from '../../../types.js';
import { AudioGeneratorBase } from '../audio-generator.js';
import { sanitizeAPIParameters } from '../../common/utils.js';
import { queueSubmit } from '../../common/queue-utils.js';
import {
  DEFAULT_MUSIC_API_ENDPOINT,
  DEFAULT_AUDIO_DURATION,
} from '../../common/constants.js';
import { logger } from '../../../../utils/logging.js';

/**
 * Music Generator Tool for generating music tracks based on text descriptions.
 *
 * This tool creates high-quality music tracks suitable for game background music, theme songs,
 * and more. It uses advanced AI to generate music that matches your description.
 *
 * [KEY FEATURES]
 * - Generates 30-second music samples in about 2 seconds
 * - Creates full 3-minute tracks in under 10 seconds
 * - Produces 44.1 kHz stereo audio with professional consistency
 *
 * [USAGE WORKFLOW]
 * 1. Submit a request with this tool and receive a request_id
 * 2. Use audio_wait tool to wait 10 seconds
 * 3. Check status with audio_status tool using the request_id
 * 4. When status is COMPLETED, retrieve result with audio_result tool
 *
 * [TIPS]
 * - Include musical style, instruments, mood, tempo, and key in your prompt
 * - For best results, be specific about the instruments and musical elements
 * - Set duration in seconds (max 180 seconds, default 30 seconds)
 */
export class MusicGeneratorTool extends AudioGeneratorBase {
  name = 'music_generate';
  description = `Generates high-quality music based on text prompts.

This tool helps developers create custom music tracks for games, videos, or any audio-requiring application.

[WHEN TO USE]
Use this tool when you need to:
1. Create background music for your game
2. Generate theme songs for characters or levels
3. Produce mood-appropriate music for different game scenes
4. Create atmospheric music for menus or loading screens
5. Experiment with different musical styles

[IMPORTANT NOTE]
- This tool is specifically designed for generating music tracks.
- For sound effects (SFX), please use the 'sfx_generate' tool instead.
- For visual assets, use the appropriate tools like 'image_asset_generate' or 'skybox_generate'.
- Music generation may take 5-10 seconds to complete. Use 'audio_wait' tool with about 10 seconds wait time, then check with 'audio_status' tool using the requestId to see if generation is complete.
- Once status shows 'COMPLETED', use 'audio_result' tool to get the final result.
- IMPORTANT: Prompts MUST be written in English only. The API does not support other languages, and non-English prompts may result in errors or unexpected results.

[KEY FEATURES]
- Generates 30-second music samples in about 2 seconds
- Creates full 3-minute tracks in under 10 seconds
- Produces 44.1 kHz stereo audio
- Professional consistency with no breaks or interruptions
- Results delivered as WAV files

[TIPS FOR BEST RESULTS]
- Write all prompts in English only
- Describe the musical style and mood clearly
- Specify any desired instruments or sound characteristics
- Include tempo, key, or other musical attributes if relevant
- Be specific about the emotional impact you want the music to have
- Consider how the music will fit with other elements of your game`;

  inputSchema = {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'Detailed description of the music to generate (must be in English)',
      },
      duration: {
        type: 'number',
        description: 'Duration of the music track in seconds (30-180)',
        default: DEFAULT_AUDIO_DURATION,
      },
    },
    required: ['prompt'],
  };

  protected sanitizeAudioArgs(args: Record<string, any>): Record<string, any> {
    return {
      prompt: args.prompt,
      duration: args.duration || DEFAULT_AUDIO_DURATION,
    };
  }

  protected getAudioEndpoint(): string {
    return DEFAULT_MUSIC_API_ENDPOINT;
  }

  protected getAudioType(): string {
    return 'music';
  }

  protected async generateAsset(
    args: Record<string, any>,
    apiEndpoint: string,
    context: ToolExecutionContext
  ): Promise<any> {
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
        message: `Submitting music generation request: "${String(args.prompt).substring(0, 30)}..."`,
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
          message: 'Music generation request submitted to queue',
        });
      }

      // Return the request ID and other relevant information
      return {
        request_id: requestId,
        model: apiEndpoint,
        message: `Music generation request submitted successfully. Use audio_status to check status with request_id: ${requestId}`,
      };
    } catch (error) {
      logger.error('Failed to submit music generation request:', error);
      throw new Error(`Failed to submit music generation request: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
