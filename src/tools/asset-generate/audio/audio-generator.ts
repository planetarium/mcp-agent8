import { TOOL_TYPE_AUDIO_GENERATION } from '../common/constants.js';
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
  protected sanitizeToolArgs(args: Record<string, any>): Record<string, any> {
    // Call the original sanitize method
    return this.sanitizeAudioArgs(args);
  }

  // Methods to be implemented by child classes
  protected abstract sanitizeAudioArgs(args: Record<string, any>): Record<string, any>;

  protected abstract getAudioEndpoint(): string;

  /**
   * Returns the type of audio being generated
   * Used for progress messages
   */
  protected abstract getAudioType(): string;
}
