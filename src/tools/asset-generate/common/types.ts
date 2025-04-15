import { Tool, ToolExecutionContext, ToolResult } from '../../types.js';

// Base asset generator abstract class
export abstract class AssetGeneratorBase implements Tool {
  abstract name: string;
  abstract description: string;
  abstract inputSchema: Record<string, unknown>;

  async execute(args: Record<string, any>, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      // Common preprocessing
      const sanitizedArgs = this.sanitizeArgs(args);
      const apiEndpoint = this.getApiEndpoint(sanitizedArgs);

      // Initial progress reporting
      if (context.progressCallback) {
        await context.progressCallback({
          progress: 0.1,
          total: 1,
          message: `Preparing ${this.name} generation...`,
        });
      }

      // Call the asset generation method of child class
      const result = await this.generateAsset(sanitizedArgs, apiEndpoint, context);

      // Completion progress reporting
      if (context.progressCallback) {
        await context.progressCallback({
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
  }

  // Methods to be implemented by child classes
  protected abstract generateAsset(
    args: Record<string, any>,
    apiEndpoint: string,
    context: ToolExecutionContext
  ): Promise<any>;

  // Common utility methods
  protected sanitizeArgs(args: Record<string, any>): Record<string, any> {
    // Default implementation - can be extended by child classes
    return { ...args };
  }

  protected getApiEndpoint(args: Record<string, any>): string {
    // Default implementation - can be extended by child classes
    return args.apiEndpoint || '';
  }
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

  async execute(args: Record<string, any>, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const url = args.url;

      // Progress reporting
      if (context.progressCallback) {
        await context.progressCallback({
          progress: 0.5,
          total: 1,
          message: `Fetching ${this.getAssetType()} result...`,
        });
      }

      // Fetch result
      const result = await this.fetchResult(url);

      // Completion reporting
      if (context.progressCallback) {
        await context.progressCallback({
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
  }

  // Methods to be implemented by child classes
  protected abstract fetchResult(url: string): Promise<any>;
  protected abstract getAssetType(): string;
}
