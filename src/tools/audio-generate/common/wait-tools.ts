import { ToolExecutionContext, Tool, ToolResult } from '../../types.js';
import { queueStatus, queueResult } from './queue-utils.js';
import { logger } from '../../../utils/logging.js';

/**
 * Audio Status Tool
 *
 * Checks the status of a queued audio generation request.
 */
export class AudioStatusTool implements Tool {
  name = 'audio_status';
  description = `Checks the status of a queued audio generation request.

Use this tool to check the current status of an audio generation job in the queue. Note that status updates may not be immediate - please allow approximately 5-10 seconds between status checks for updates to propagate.

When you receive 'COMPLETED' status, use the audio_result tool with the same requestId to get the final output.`;

  inputSchema = {
    type: 'object',
    properties: {
      request_id: {
        type: 'string',
        description: 'The request ID received from music_generate or sfx_generate tool',
      },
      model: {
        type: 'string',
        description: 'The model path (e.g., "CassetteAI/music-generator" or "CassetteAI/sound-effects-generator"). Will be inferred from request_id if not provided.',
      },
    },
    required: ['request_id'],
  };

  async execute(args: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const requestId = args.request_id as string;

      // For model, use provided value or default to music-generator
      // (This is just fallback as model should be provided along with request_id)
      const model = (args.model as string) || 'CassetteAI/music-generator';

      // Update progress
      if (context.progressCallback) {
        await context.progressCallback({
          progress: 0.5,
          total: 1,
          message: `Checking status of request ${requestId}...`,
        });
      }

      // Check queue status
      const result = await queueStatus(model, requestId);

      // Report completion
      if (context.progressCallback) {
        await context.progressCallback({
          progress: 1,
          total: 1,
          message: `Status check completed: ${result.status || 'UNKNOWN'}`,
        });
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            request_id: requestId,
            status: result.status,
            model,
            details: result,
            message: `Request status: ${result.status || 'UNKNOWN'}. ${result.status === 'COMPLETED' ? 'Use audio_result tool with this request_id to get the final result.' : 'Use audio_wait tool to wait before checking again.'}`
          })
        }],
        isError: false,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to check audio status:', error);
      return {
        content: [{ type: 'text', text: `Error: ${errorMessage}` }],
        isError: true,
      };
    }
  }
}

/**
 * Audio Result Tool
 *
 * Retrieves the final result of a completed audio generation request.
 */
export class AudioResultTool implements Tool {
  name = 'audio_result';
  description = `Retrieves the final result of a completed audio generation request.

Use this tool after audio_status reports 'COMPLETED' status to get the final audio file URL.`;

  inputSchema = {
    type: 'object',
    properties: {
      request_id: {
        type: 'string',
        description: 'The request ID received from music_generate or sfx_generate tool',
      },
      model: {
        type: 'string',
        description: 'The model path (e.g., "CassetteAI/music-generator" or "CassetteAI/sound-effects-generator"). Will be inferred from request_id if not provided.',
        default: 'CassetteAI/music-generator'
      }
    },
    required: ['request_id'],
  };

  async execute(args: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const requestId = args.request_id as string;
      const model = (args.model as string) || 'CassetteAI/music-generator';

      // Update progress
      if (context.progressCallback) {
        await context.progressCallback({
          progress: 0.5,
          total: 1,
          message: `Retrieving result for request ${requestId}...`,
        });
      }

      // Get the result
      const result = await queueResult(model, requestId);

      // Extract audio URL from result
      let audioUrl = '';

      // Handle different result formats using type-safe approach
      try {
        // Try to get URL from audio_file direct property
        if (result &&
            typeof result === 'object' &&
            'audio_file' in result &&
            result['audio_file'] &&
            typeof result['audio_file'] === 'object' &&
            'url' in result['audio_file']) {
          audioUrl = String(result['audio_file']['url']);
        }
        // Try to get URL from nested data.audio_file property
        else if (result &&
                typeof result === 'object' &&
                'data' in result &&
                result['data'] &&
                typeof result['data'] === 'object' &&
                'audio_file' in result['data'] &&
                result['data']['audio_file'] &&
                typeof result['data']['audio_file'] === 'object' &&
                'url' in result['data']['audio_file']) {
          audioUrl = String(result['data']['audio_file']['url']);
        }
      } catch (e) {
        logger.error('Error parsing audio URL from result', e);
      }

      if (!audioUrl) {
        logger.error('Unexpected response structure:', JSON.stringify(result));
        throw new Error('Expected audio file URL not found in result');
      }

      // Report completion
      if (context.progressCallback) {
        await context.progressCallback({
          progress: 1,
          total: 1,
          message: 'Audio result retrieved successfully',
        });
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            request_id: requestId,
            url: audioUrl,
            message: 'Audio generated successfully'
          })
        }],
        isError: false,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to retrieve audio result:', error);
      return {
        content: [{ type: 'text', text: `Error: ${errorMessage}` }],
        isError: true,
      };
    }
  }
}

/**
 * Audio Wait Tool
 *
 * A utility tool that allows the LLM to wait a specified amount of time before checking status again.
 */
export class AudioWaitTool implements Tool {
  name = 'audio_wait';
  description = `Allows waiting for a specified number of seconds before continuing execution.

Use this tool between status checks to give time for audio generation to progress.
The recommended wait time is 5-10 seconds between status checks for music generation and 2-5 seconds for sound effects.`;

  inputSchema = {
    type: 'object',
    properties: {
      seconds: {
        type: 'integer',
        description: 'Number of seconds to wait. Default is 10 seconds.',
        default: 10,
        minimum: 1,
        maximum: 60,
      },
      status_message: {
        type: 'string',
        description: 'Optional status message to display during the wait',
      },
    },
    required: ['seconds'],
  };

  async execute(args: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const seconds = (args.seconds as number) || 10;
      const statusMessage =
        (args.status_message as string) || `Waiting ${seconds} seconds for audio generation...`;

      // Limit waiting time to a reasonable amount (between 1 and 60 seconds)
      const waitTime = Math.max(1, Math.min(60, seconds));

      // Initial progress update
      if (context.progressCallback) {
        await context.progressCallback({
          progress: 0,
          total: waitTime,
          message: statusMessage,
        });
      }

      // Wait loop with progress updates
      for (let i = 1; i <= waitTime; i++) {
        // Wait for 1 second
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Update progress every second
        if (context.progressCallback) {
          await context.progressCallback({
            progress: i,
            total: waitTime,
            message: `${statusMessage} (${i}/${waitTime}s)`,
          });
        }
      }

      // Final progress update
      if (context.progressCallback) {
        await context.progressCallback({
          progress: waitTime,
          total: waitTime,
          message: 'Wait completed. You can now check the status again.',
        });
      }

      return {
        content: [
          {
            type: 'text',
            text: `Waited for ${waitTime} seconds. You can now check the status of your audio generation.`,
          },
        ],
        isError: false,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to execute wait:', error);
      return {
        content: [{ type: 'text', text: `Error during wait: ${errorMessage}` }],
        isError: true,
      };
    }
  }
}
