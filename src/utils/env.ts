import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';

/**
 * Environment Variable Management Class
 * Loads environment variables from .env files and makes them available to the application.
 */
export class Environment {
  private static instance: Environment;
  private initialized: boolean = false;

  /**
   * Get singleton instance
   */
  public static getInstance(): Environment {
    if (!Environment.instance) {
      Environment.instance = new Environment();
    }
    return Environment.instance;
  }

  /**
   * Load .env file
   * @param customPath Custom path to .env file (optional)
   */
  public load(customPath?: string): void {
    if (this.initialized) {
      return;
    }

    let envPath = customPath;

    // Use default .env file if custom path is not specified
    if (!envPath) {
      envPath = path.resolve(process.cwd(), '.env');
    }

    // Check if file exists
    if (fs.existsSync(envPath)) {
      // Load .env file
      const result = config({ path: envPath });

      if (result.error) {
        throw new Error(`Failed to load environment variables: ${result.error.message}`);
      } else {
        this.initialized = true;
      }
    }
  }

  /**
   * Get environment variable
   * @param key Environment variable key
   * @param defaultValue Default value (optional)
   * @returns Environment variable value or default value
   */
  public get(key: string, defaultValue?: string): string | undefined {
    return process.env[key] || defaultValue;
  }

  /**
   * Get required environment variable (throws error if missing)
   * @param key Environment variable key
   * @returns Environment variable value
   * @throws Error if environment variable is missing
   */
  public getRequired(key: string): string {
    const value = this.get(key);
    if (value === undefined) {
      const errorMessage = `Required environment variable is missing: ${key}`;
      throw new Error(errorMessage);
    }
    return value;
  }

  /**
   * Get numeric environment variable
   * @param key Environment variable key
   * @param defaultValue Default value (optional)
   * @returns Numeric value or default value
   */
  public getNumber(key: string, defaultValue?: number): number | undefined {
    const value = this.get(key);
    if (value === undefined) {
      return defaultValue;
    }
    
    const numValue = Number(value);
    return isNaN(numValue) ? defaultValue : numValue;
  }

  /**
   * Get boolean environment variable
   * @param key Environment variable key
   * @param defaultValue Default value (optional)
   * @returns Boolean value or default value
   */
  public getBoolean(key: string, defaultValue?: boolean): boolean | undefined {
    const value = this.get(key);
    if (value === undefined) {
      return defaultValue;
    }
    
    return ['true', 'yes', '1'].includes(value.toLowerCase());
  }
}

// Export environment singleton instance
export const env = Environment.getInstance(); 