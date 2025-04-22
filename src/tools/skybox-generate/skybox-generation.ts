import { ToolExecutionContext, ToolResult } from '../types.js';
import { SkyboxGeneratorBase, SkyboxStatusResponse } from './types.js';
import { blockadeRequest } from './utils.js';
import { DEFAULT_POLLING_INTERVAL } from './constants.js';
import { logger } from '../../utils/logging.js';
import { Tool } from '../types.js';

/**
 * Skybox Generator Tool
 *
 * Generates immersive 360° skybox environments based on text prompts.
 */
export class SkyboxGeneratorTool extends SkyboxGeneratorBase {
  name = 'skybox_generate';
  description = `Generates immersive 360° skybox environments based on text prompts.

This tool helps developers quickly create skybox environments for VR/AR applications and games.

[WHEN TO USE]
Use this tool when you need to:
1. Create immersive 360° environments for your game
2. Generate skyboxes for virtual reality experiences
3. Create environmental backgrounds for scenes
4. Visualize game worlds or levels

[TIPS FOR BEST RESULTS]
- Provide detailed descriptions of the environment
- Include lighting conditions and atmospheric details
- Specify the style or aesthetic you want`;

  inputSchema = {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'Text prompt describing the skybox world you wish to create',
      },
      webhook_url: {
        type: 'string',
        description: 'Optional URL to receive webhook notifications of generation progress'
      }
    },
    required: ['prompt']
  };

  protected sanitizeArgs(args: Record<string, unknown>): Record<string, unknown> {
    return {
      prompt: args.prompt,
      webhook_url: args.webhook_url
    };
  }

  protected getApiEndpoint(): string {
    return 'skybox';
  }

  protected async generateAsset(
    args: Record<string, unknown>,
    apiEndpoint: string,
    context: ToolExecutionContext
  ): Promise<Record<string, unknown>> {
    // Progress update
    if (context.progressCallback) {
      await context.progressCallback({
        progress: 0.3,
        total: 1,
        message: `Starting skybox generation: "${String(args.prompt).substring(0, 30)}..."`,
      });
    }

    try {
      // Make the API request
      const result = await blockadeRequest(apiEndpoint, 'POST', args);

      // Progress update
      if (context.progressCallback) {
        await context.progressCallback({
          progress: 0.7,
          total: 1,
          message: 'Skybox generation initiated successfully',
        });
      }

      return {
        skybox_id: result.id,
        obfuscated_id: result.obfuscated_id,
        status: result.status,
        pusher_channel: result.pusher_channel,
        pusher_event: result.pusher_event,
        queue_position: result.queue_position,
        message: `Skybox generation initiated. Use skybox_status tool with obfuscated_id to check status.`
      };
    } catch (error) {
      logger.error('Failed to initiate skybox generation:', error);
      throw new Error(`Failed to initiate skybox generation: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Skybox Status Tool
 *
 * Checks the status of a queued skybox generation request.
 */
export class SkyboxStatusTool implements Tool {
  name = 'skybox_status';
  description = `Checks the status of a queued skybox generation request.
  
Use this tool to monitor the progress of a skybox generation request initiated with skybox_generate.`;

  inputSchema = {
    type: 'object',
    properties: {
      obfuscated_id: {
        type: 'string',
        description: 'The obfuscated_id received from a skybox_generate call',
      },
    },
    required: ['obfuscated_id'],
  };

  async execute(args: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolResult> {
    const { progressCallback } = context;
    try {
      // Update progress
      if (progressCallback) {
        await progressCallback({
          progress: 0.3,
          total: 1,
          message: `Checking skybox generation status...`,
        });
      }

      // API endpoint for status check
      const endpoint = `imagine/requests/${args.obfuscated_id}`;

      // Make request
      const result = await blockadeRequest(endpoint, 'GET');

      // Update progress
      if (progressCallback) {
        await progressCallback({
          progress: 1,
          total: 1,
          message: `Skybox status check completed`,
        });
      }

      const response: SkyboxStatusResponse = {
        skybox_id: typeof result.id === 'number' ? result.id : Number(result.id),
        status: this.validateStatus(String(result.status)),
        file_url: result.file_url ? String(result.file_url) : undefined,
        thumb_url: result.thumb_url ? String(result.thumb_url) : undefined,
        depth_map_url: result.depth_map_url ? String(result.depth_map_url) : undefined,
        error_message: result.error_message ? String(result.error_message) : undefined,
        queue_position: result.queue_position !== undefined ?
          (typeof result.queue_position === 'number' ? result.queue_position : Number(result.queue_position)) :
          undefined,
        updated_at: String(result.updated_at),
        is_complete: String(result.status) === 'complete'
      };

      // Return data about current status
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response)
        }],
        isError: false,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text', text: `Error checking skybox status: ${errorMessage}` }],
        isError: true,
      };
    }
  }

  /**
   * 상태 값이 유효한지 확인하고 타입 안전성 보장
   */
  private validateStatus(status: string): SkyboxStatusResponse['status'] {
    const validStatuses: Array<SkyboxStatusResponse['status']> = [
      'pending', 'dispatched', 'processing', 'complete', 'abort', 'error'
    ];

    if (validStatuses.includes(status as SkyboxStatusResponse['status'])) {
      return status as SkyboxStatusResponse['status'];
    }

    // 유효하지 않은 상태인 경우 기본값 반환
    logger.warn(`Invalid status received: ${status}, defaulting to 'pending'`);
    return 'pending';
  }
}

/**
 * Skybox Wait Tool
 *
 * Polls a skybox generation request until it completes or fails.
 */
export class SkyboxWaitTool implements Tool {
  name = 'skybox_wait';
  description = `Polls a skybox generation request until it completes or fails.
  
This tool continuously checks the status of a skybox generation and returns the final result when completed.`;

  inputSchema = {
    type: 'object',
    properties: {
      obfuscated_id: {
        type: 'string',
        description: 'The obfuscated_id received from a skybox_generate call',
      },
      timeout_seconds: {
        type: 'number',
        description: 'Maximum time to wait in seconds before timing out',
        default: 300 // 5 minutes default
      },
      polling_interval: {
        type: 'number',
        description: 'How often to check status (in milliseconds)',
        default: DEFAULT_POLLING_INTERVAL
      }
    },
    required: ['obfuscated_id'],
  };

  async execute(args: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolResult> {
    const { progressCallback, signal } = context;

    try {
      const obfuscatedId = String(args.obfuscated_id);
      const timeoutMs = (Number(args.timeout_seconds) || 300) * 1000;
      const pollingInterval = Number(args.polling_interval) || DEFAULT_POLLING_INTERVAL;

      // Calculate total polling attempts
      const maxAttempts = Math.ceil(timeoutMs / pollingInterval);
      let currentAttempt = 0;

      const startTime = Date.now();

      // Polling loop
      while (true) {
        // Check for abort signal
        if (signal?.aborted) {
          throw new Error('Operation was aborted');
        }

        // Check timeout
        if (Date.now() - startTime > timeoutMs) {
          throw new Error(`Timed out after ${args.timeout_seconds} seconds`);
        }

        currentAttempt++;

        // Update progress
        if (progressCallback) {
          const progressPercent = Math.min(0.9, (currentAttempt / maxAttempts) * 0.9);
          await progressCallback({
            progress: progressPercent,
            total: 1,
            message: `Waiting for skybox generation to complete (attempt ${currentAttempt})...`,
          });
        }

        // Check status
        const endpoint = `imagine/requests/${obfuscatedId}`;
        const result = await blockadeRequest(endpoint, 'GET');

        // If completed or error, return result
        const status = String(result.status);
        if (status === 'complete' || status === 'error' || status === 'abort') {
          // Final progress update
          if (progressCallback) {
            await progressCallback({
              progress: 1,
              total: 1,
              message: `Skybox generation ${status}: ${status === 'complete' ? 'Completed successfully' : 'Failed'}`,
            });
          }

          const response: SkyboxStatusResponse = {
            skybox_id: typeof result.id === 'number' ? result.id : Number(result.id),
            status: this.validateStatus(status),
            file_url: result.file_url ? String(result.file_url) : undefined,
            thumb_url: result.thumb_url ? String(result.thumb_url) : undefined,
            depth_map_url: result.depth_map_url ? String(result.depth_map_url) : undefined,
            error_message: result.error_message ? String(result.error_message) : undefined,
            updated_at: String(result.updated_at),
            is_complete: status === 'complete'
          };

          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response)
            }],
            isError: status === 'error' || status === 'abort',
          };
        }

        // Wait before next polling attempt
        await new Promise(resolve => setTimeout(resolve, pollingInterval));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text', text: `Error during skybox wait: ${errorMessage}` }],
        isError: true,
      };
    }
  }

  /**
   * 상태 값이 유효한지 확인하고 타입 안전성 보장
   */
  private validateStatus(status: string): SkyboxStatusResponse['status'] {
    const validStatuses: Array<SkyboxStatusResponse['status']> = [
      'pending', 'dispatched', 'processing', 'complete', 'abort', 'error'
    ];

    if (validStatuses.includes(status as SkyboxStatusResponse['status'])) {
      return status as SkyboxStatusResponse['status'];
    }

    // 유효하지 않은 상태인 경우 기본값 반환
    logger.warn(`Invalid status received: ${status}, defaulting to 'pending'`);
    return 'pending';
  }
}