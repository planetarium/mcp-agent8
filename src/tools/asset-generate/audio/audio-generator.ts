import { Tool, ToolExecutionContext, ToolResult } from '../../types.js';
import { TOOL_TYPE_AUDIO_GENERATION } from '../common/constants.js';

/**
 * Base class for audio generation tools
 */
export abstract class AudioGeneratorBase implements Tool {
  abstract name: string;
  abstract description: string;
  abstract inputSchema: Record<string, unknown>;

  async execute(
    args: Record<string, unknown>,
    context: ToolExecutionContext
  ): Promise<ToolResult> {
    const { progressCallback } = context;
    try {
      // Sanitize arguments
      const sanitizedArgs = this.sanitizeArgs(args);

      // Get API endpoint
      const apiEndpoint = this.getApiEndpoint();

      // Initial progress reporting
      if (progressCallback) {
        await progressCallback({
          progress: 0.1,
          total: 1,
          message: `Starting ${this.getAudioType()} generation`,
        });
      }

      // Generate audio
      const result = await this.generateAudio(sanitizedArgs, apiEndpoint, context);

      // Completion progress reporting
      if (progressCallback) {
        await progressCallback({
          progress: 1,
          total: 1,
          message: `${this.name} request submitted successfully`,
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
  }

  // Methods to be implemented by child classes
  protected abstract generateAudio(
    args: Record<string, unknown>,
    apiEndpoint: string,
    context: ToolExecutionContext
  ): Promise<Record<string, unknown>>;

  protected abstract sanitizeArgs(args: Record<string, unknown>): Record<string, unknown>;

  protected abstract getApiEndpoint(): string;

  protected abstract getAudioType(): string;

  /**
   * Returns the tool type used for credit consumption
   */
  protected getToolType(): string {
    return TOOL_TYPE_AUDIO_GENERATION;
  }
}
