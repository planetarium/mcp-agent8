import { ToolExecutionContext, ToolResult } from '../types.js';
import { SkyboxGeneratorBase, SkyboxStatusResponse, SkyboxStyle } from './types.js';
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

[IMPORTANT NOTE]
- This tool is specifically optimized for creating 360° environments and skyboxes.
- For standard 2D game assets (sprites, UI elements, items, etc.), please use the 'static_asset_generate' tool instead.

[STYLE SELECTION]
First use skybox_styles tool to find a style ID that matches your needs.
Different styles offer different aesthetic qualities, for example:
- ID 67: M3 Photoreal - Highly detailed photorealistic environments
- ID 43: Anime art style - Stylized anime-inspired scenes

[TIPS FOR BEST RESULTS]
- Provide detailed descriptions of the environment
- Include lighting conditions and atmospheric details
- Specify the style or aesthetic you want
- Use skybox_styles tool to find the best style for your needs
- Pay attention to character limits for each style`;

  inputSchema = {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'Text prompt describing the skybox world you wish to create',
      },
      skybox_style_id: {
        type: 'number',
        description: 'ID of the skybox style to use. Use the skybox_styles tool to see available styles',
        default: 67
      },
      webhook_url: {
        type: 'string',
        description: 'Optional URL to receive webhook notifications of generation progress'
      }
    },
    required: ['prompt']
  };

  protected sanitizeToolArgs(args: Record<string, unknown>): Record<string, unknown> {
    return {
      prompt: args.prompt,
      skybox_style_id: args.skybox_style_id || 67, // Default to style ID 67 if not provided
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
 * Skybox Styles Tool
 *
 * Lists available skybox styles for generating immersive 360° environments.
 */
export class SkyboxStylesTool implements Tool {
  name = 'skybox_styles';
  description = `Lists available skybox styles for generating immersive 360° environments.
  
Use this tool to discover available skybox style options before using the skybox_generate tool.
Each style has a unique ID and influences the overall aesthetic of generated skyboxes.`;

  inputSchema = {
    type: 'object',
    properties: {}
  };

  async execute(args: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolResult> {
    const { progressCallback } = context;
    try {
      // Update progress
      if (progressCallback) {
        await progressCallback({
          progress: 0.3,
          total: 1,
          message: `Fetching available skybox styles...`,
        });
      }

      // API endpoint for skybox styles
      const endpoint = 'skybox/styles';

      // Make request
      const result = await blockadeRequest(endpoint, 'GET');

      // API returns array directly, not wrapped in an object
      const styles = Array.isArray(result) ? result : [];

      // Format the styles information for better readability and usage
      const formattedStyles = styles.map((style: SkyboxStyle) => ({
        id: style.id,
        name: style.name,
        model: style.model,
        model_version: style.model_version,
        max_char: style["max-char"],
        negative_text_max_char: style["negative-text-max-char"],
        image: style.image,
        sort_order: style.sort_order,
        description: `Style ${style.id}: ${style.name} (${style.model})`
      }));

      // Update progress
      if (progressCallback) {
        await progressCallback({
          progress: 1,
          total: 1,
          message: `Successfully retrieved ${formattedStyles.length} skybox styles`,
        });
      }

      // Format response as a helpful message with style options
      let responseText = `Available Skybox Styles:\n\n`;
      formattedStyles.sort((a, b) => a.sort_order - b.sort_order).forEach(style => {
        responseText += `ID: ${style.id} - ${style.name}\n`;
        responseText += `Model: ${style.model} (version: ${style.model_version})\n`;
        responseText += `Character limits: Prompt (${style.max_char}), Negative prompt (${style.negative_text_max_char})\n`;
        responseText += `Image example: ${style.image}\n\n`;
      });

      responseText += `To use a specific style, include the 'skybox_style_id' parameter when calling the skybox_generate tool.`;

      return {
        content: [{
          type: 'text',
          text: responseText
        }],
        isError: false,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text', text: `Error fetching skybox styles: ${errorMessage}` }],
        isError: true,
      };
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
      const endpoint = `imagine/requests/obfuscated-id/${args.obfuscated_id}`;

      // Make request
      const result = await blockadeRequest(endpoint, 'GET');
      // 응답에서 request 객체 추출
      const resultData = result.request as Record<string, unknown>;

      // Update progress
      if (progressCallback) {
        await progressCallback({
          progress: 1,
          total: 1,
          message: `Skybox status check completed`,
        });
      }

      const response: SkyboxStatusResponse = {
        skybox_id: typeof resultData.id === 'number' ? resultData.id : Number(resultData.id),
        status: this.validateStatus(String(resultData.status)),
        file_url: resultData.file_url ? String(resultData.file_url) : undefined,
        thumb_url: resultData.thumb_url ? String(resultData.thumb_url) : undefined,
        depth_map_url: resultData.depth_map_url ? String(resultData.depth_map_url) : undefined,
        error_message: resultData.error_message ? String(resultData.error_message) : undefined,
        queue_position: resultData.queue_position !== undefined ?
          (typeof resultData.queue_position === 'number' ? resultData.queue_position : Number(resultData.queue_position)) :
          undefined,
        updated_at: String(resultData.updated_at),
        is_complete: String(resultData.status) === 'complete'
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
   * Validates status value and ensures type safety
   */
  private validateStatus(status: string): SkyboxStatusResponse['status'] {
    const validStatuses: Array<SkyboxStatusResponse['status']> = [
      'pending', 'dispatched', 'processing', 'complete', 'abort', 'error'
    ];

    if (validStatuses.includes(status as SkyboxStatusResponse['status'])) {
      return status as SkyboxStatusResponse['status'];
    }

    // Return default value for invalid status
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
        const endpoint = `imagine/requests/obfuscated-id/${obfuscatedId}`;
        const result = await blockadeRequest(endpoint, 'GET');
        // 응답에서 request 객체 추출
        const resultData = result.request as Record<string, unknown>;

        // If completed or error, return result
        const status = String(resultData.status);
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
            skybox_id: typeof resultData.id === 'number' ? resultData.id : Number(resultData.id),
            status: this.validateStatus(status),
            file_url: resultData.file_url ? String(resultData.file_url) : undefined,
            thumb_url: resultData.thumb_url ? String(resultData.thumb_url) : undefined,
            depth_map_url: resultData.depth_map_url ? String(resultData.depth_map_url) : undefined,
            error_message: resultData.error_message ? String(resultData.error_message) : undefined,
            updated_at: String(resultData.updated_at),
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
   * Validates status value and ensures type safety
   */
  private validateStatus(status: string): SkyboxStatusResponse['status'] {
    const validStatuses: Array<SkyboxStatusResponse['status']> = [
      'pending', 'dispatched', 'processing', 'complete', 'abort', 'error'
    ];

    if (validStatuses.includes(status as SkyboxStatusResponse['status'])) {
      return status as SkyboxStatusResponse['status'];
    }

    // Return default value for invalid status
    logger.warn(`Invalid status received: ${status}, defaulting to 'pending'`);
    return 'pending';
  }
}
