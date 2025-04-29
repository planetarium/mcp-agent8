import { ToolExecutionContext, Tool, ToolResult, ToolCategory, ToolMetadata } from '../../types.js';
import { logger } from '../../../utils/logging.js';

/**
 * Universal Asset Wait Tool
 *
 * A unified waiting tool that can be used across all asset generation processes.
 * This replaces the individual wait tools previously used for different asset types.
 */
export class AssetWaitTool implements Tool {
  name = 'asset_wait';
  description = `A universal tool for waiting a specified amount of time.

Common use cases:
- Wait between cinematic generation status checks (recommended: 60 seconds)
- Wait between skybox generation status checks (recommended: 10-20 seconds)
- Wait between audio generation status checks (recommended: 5-10 seconds)

Can be used with any asset generation process.`;

  // Tool metadata - this tool belongs to multiple categories
  metadata: ToolMetadata = {
    categories: [
      ToolCategory.ASSET_GENERATION,
      ToolCategory.IMAGE_GENERATION,
      ToolCategory.CINEMATIC_GENERATION,
      ToolCategory.AUDIO_GENERATION,
      ToolCategory.SKYBOX_GENERATION
    ]
  };

  inputSchema = {
    type: 'object',
    properties: {
      seconds: {
        type: 'integer',
        description: 'Number of seconds to wait',
        default: 10,
        minimum: 1,
        maximum: 120
      },
      status_message: {
        type: 'string',
        description: 'Custom status message to display during the wait. If not provided, a default message will be used.'
     }

    },
    required: ['seconds']
  };

  async execute(args: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const seconds = (args.seconds as number) || 10;
      const statusMessage = (args.status_message as string) || `Waiting ${seconds} seconds...`;

      // Limit waiting time to a reasonable amount (between 1 and 120 seconds)
      const waitTime = Math.max(1, Math.min(120, seconds));

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
          message: 'Wait completed.',
        });
     }


      return {
        content: [
          {
            type: 'text',
            text: `Waited for ${waitTime} seconds. You can now continue.`,
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
