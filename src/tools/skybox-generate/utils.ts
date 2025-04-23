import axios, { AxiosRequestConfig } from 'axios';
import { BLOCKADE_API_KEY_ENV_VAR, DEFAULT_TIMEOUT, BLOCKADE_LABS_API_URL } from './constants.js';
import { logger } from '../../utils/logging.js';
import { env } from '../../utils/env.js';

/**
 * Gets Blockade Labs API key from environment
 */
export function getBlockadeApiKey(): string {
  const apiKey = env.get(BLOCKADE_API_KEY_ENV_VAR);
  if (!apiKey) {
    throw new Error(`${BLOCKADE_API_KEY_ENV_VAR} environment variable is not set`);
  }
  return apiKey;
}

/**
 * Makes authenticated request to Blockade Labs API
 */
export async function blockadeRequest(
  endpoint: string,
  method = 'GET',
  data?: Record<string, unknown>,
  customHeaders?: Record<string, string>
): Promise<Record<string, unknown>> {
  try {
    const apiKey = getBlockadeApiKey();
    const url = `${BLOCKADE_LABS_API_URL}/${endpoint}`;

    const headers = {
      'x-api-key': apiKey,
      ...customHeaders
    };

    const config: AxiosRequestConfig = {
      method,
      url,
      headers,
      timeout: DEFAULT_TIMEOUT,
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    logger.error('Failed to make Blockade Labs API request:', error);
    throw error;
  }
}
