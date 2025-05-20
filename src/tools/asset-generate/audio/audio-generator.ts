import { DEFAULT_AUDIO_DURATION, TOOL_TYPE_AUDIO_GENERATION } from '../common/constants.js';
import { AssetGeneratorBase } from '../common/asset-generator.js';

/**
 * Base class for audio generation tools
 */
export abstract class AudioGeneratorBase extends AssetGeneratorBase {
  /**
   * Returns the tool type used for credit consumption
   */
  protected getToolType(): string {
    return TOOL_TYPE_AUDIO_GENERATION;
  }

  /**
   * Returns the usage count for credit consumption based on tool arguments
   * @param _args The arguments for the tool
   * @returns Number of credits to consume
   */
  protected getToolUsageCount(args: Record<string, unknown>): number {
    return args.duration || DEFAULT_AUDIO_DURATION;
  }

  /**
   * Returns the description for credit consumption
   * @param args The arguments for the tool
   * @returns Description of the tool usage
   */
  protected getToolUsageDescription(args: Record<string, unknown>): string {
    const audioType = this.getAudioType();
    const duration = args.duration || 30;
    return `${audioType} generation (${duration}s): "${String(args.prompt).substring(0, 30)}..."`;
  }

  /**
   * Returns the API endpoint for the tool
   * @param args The arguments for the tool
   * @returns The API endpoint to use
   */
  protected getApiEndpoint(): string {
    // Call the original endpoint method that doesn't take args
    return this.getAudioEndpoint();
  }

  /**
   * Sanitizes the arguments for the tool
   * @param args The arguments to sanitize
   * @returns The sanitized arguments
   */
  protected sanitizeToolArgs(args: Record<string, unknown>): Record<string, unknown> {
    // Call the original sanitize method
    return this.sanitizeAudioArgs(args);
  }

  // Methods to be implemented by child classes
  protected abstract sanitizeAudioArgs(args: Record<string, unknown>): Record<string, unknown>;

  protected abstract getAudioEndpoint(): string;

  /**
   * Returns the type of audio being generated
   * Used for progress messages
   */
  protected abstract getAudioType(): string;
}
