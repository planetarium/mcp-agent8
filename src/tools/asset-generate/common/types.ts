import { Tool, ToolExecutionContext, ToolResult } from '../../types.js';
import { consumeToolUsageCredits } from './utils.js';
import { logger } from '../../../utils/logging.js';

// Base asset generator abstract class
export abstract class AssetGeneratorBase implements Tool {
  abstract name: string;
  abstract description: string;
  abstract inputSchema: Record<string, unknown>;

  execute = async (
    args: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolResult> => {
    const { progressCallback } = context;
    try {
      // Common preprocessing
      const apiEndpoint = this.getApiEndpoint(args);

      // Initial progress reporting
      if (progressCallback) {
        await progressCallback({
          progress: 0.1,
          total: 1,
          message: 'Starting asset generation',
        });
      }
      // Consume credits for tool usage if we have user ID
      const userId = this.getUserId(context);
      logger.debug(`userId: ${userId}`);

      if (userId) {
        try {
          const toolType = this.getToolType();
          await consumeToolUsageCredits(userId, toolType);
          if (progressCallback) {
            await progressCallback({
              progress: 0.15,
              total: 1,
              message: `Credits consumed for ${this.name}`,
            });
          }
        } catch (creditError) {
          // Credit consumption failure should fail the entire operation
          logger.error(`Failed to consume credits: ${creditError}`);
          throw new Error(`Credit consumption failed: ${creditError instanceof Error ? creditError.message : String(creditError)}`);
        }
      }

      // Call the asset generation method of child class
      const result = await this.generateAsset(args, apiEndpoint, context);

      // Completion progress reporting
      if (progressCallback) {
        await progressCallback({
          progress: 1,
          total: 1,
          message: `${this.name} generation completed successfully`,
        });
      }

      // Return result
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        isError: false,
      };
    } catch (error: unknown) {
      // Error handling
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text', text: `Error: ${errorMessage}` }],
        isError: true,
      };
    }
  };

  /**
   * Extract user ID from context
   * @param context Tool execution context
   * @returns User ID or undefined if not available
   *
   * This method attempts to find the user ID from various sources.
   * When REQUIRE_AUTH=false, the user ID may not be available,
   * and in this case, the credit consumption functionality will not be executed.
   */
  protected getUserId(context: ToolExecutionContext): string | undefined {
    // Attempt to get user ID from various possible locations in the context
    return context.v8User?.userUid;
  }

  // Methods to be implemented by child classes
  protected abstract generateAsset(
    args: Record<string, any>,
    apiEndpoint: string,
    context: ToolExecutionContext
  ): Promise<any>;

  /**
   * Returns the tool type used for credit consumption
   * Must be implemented by child classes
   */
  protected abstract getToolType(): string;

  /**
   * Sanitizes the arguments for the tool
   * @param args The arguments to sanitize
   * @returns The sanitized arguments
   */
  protected abstract sanitizeArgs(args: Record<string, any>): Record<string, any>;

  /**
   * Returns the API endpoint for the tool
   * Must be implemented by child classes
   */
  protected abstract getApiEndpoint(args: Record<string, any>): string;
}

// Result tool base class
export abstract class AssetResultBase implements Tool {
  abstract name: string;
  abstract description: string;

  inputSchema = {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The response URL from a queued request.',
      },
    },
    required: ['url'],
  };

  execute = async (
    args: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolResult> => {
    const { progressCallback } = context;
    try {
      const url = args.url;

      // Progress reporting
      if (progressCallback) {
        await progressCallback({
          progress: 0.5,
          total: 1,
          message: 'Preparing asset information',
        });
      }

      // Fetch result
      const result = await this.fetchResult(url);

      // Completion reporting
      if (progressCallback) {
        await progressCallback({
          progress: 1,
          total: 1,
          message: `${this.getAssetType()} result fetched successfully`,
        });
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        isError: false,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text', text: `Error: ${errorMessage}` }],
        isError: true,
      };
    }
  };

  // Methods to be implemented by child classes
  protected abstract fetchResult(url: string): Promise<any>;

  protected abstract getAssetType(): string;
}
