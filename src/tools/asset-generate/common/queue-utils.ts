import axios, { AxiosRequestConfig } from 'axios';
import { logger } from '../../../utils/logging.js';
import { API_KEY_ENV_VAR, FAL_QUEUE_URL, AUTHENTICATED_TIMEOUT } from './constants.js';

/**
 * Gets API key from environment
 */
export function getApiKey(): string {
  const apiKey = process.env[API_KEY_ENV_VAR];
  if (!apiKey) {
    throw new Error(`${API_KEY_ENV_VAR} environment variable is not set`);
  }
  return apiKey;
}

/**
 * Submit a request to the fal.ai queue
 * @param modelPath Model path (e.g. "CassetteAI/music-generator")
 * @param input Input parameters for the model
 * @returns Request ID and response data
 */
export async function queueSubmit(modelPath: string, input: Record<string, unknown>): Promise<{request_id: string; [key: string]: unknown}> {
  try {
    const apiKey = getApiKey();
    logger.info(`Making request to: ${FAL_QUEUE_URL}/${modelPath}`);

    // CassetteAI API requires parameters directly at the root level, not nested in an 'input' object
    const isCassetteAI = modelPath.toLowerCase().includes('cassetteai');
    const requestData = isCassetteAI ? input : { input };

    const config: AxiosRequestConfig = {
      method: 'POST',
      url: `${FAL_QUEUE_URL}/${modelPath}`,
      headers: {
        Authorization: `Key ${apiKey}`,
        'Content-Type': 'application/json'
      },
      data: requestData,
      timeout: AUTHENTICATED_TIMEOUT,
    };

    logger.debug(`Request data for ${modelPath}:`, JSON.stringify(requestData));
    const response = await axios(config);
    logger.info(`Queue submit response for ${modelPath}:`, JSON.stringify(response.data));
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status;
      const responseData = error.response?.data;
      logger.error(`Failed to submit request to queue [${statusCode}]:`, {
        modelPath,
        error: error.message,
        response: responseData,
        input: JSON.stringify(input),
        endpoint: `${FAL_QUEUE_URL}/${modelPath}`
      });

      if (statusCode === 422) {
        // Attempt to correct case sensitivity in modelPath
        const correctedModelPath = modelPath.replace(/cassetteai/i, 'CassetteAI');
        if (correctedModelPath !== modelPath) {
          logger.warn(`Attempting with corrected model path: ${correctedModelPath}`);
          return await queueSubmit(correctedModelPath, input);
        }
      }
    } else {
      logger.error('Failed to submit request to queue (non-Axios error):', error);
    }
    throw error;
  }
}

/**
 * Check the status of a queued request
 * @param modelPath Model path (e.g. "CassetteAI/music-generator")
 * @param requestId Request ID from queue submission
 * @returns Status information
 */
export async function queueStatus(modelPath: string, requestId: string): Promise<Record<string, unknown>> {
  try {
    const apiKey = getApiKey();
    logger.info(`Making request to: ${FAL_QUEUE_URL}/${modelPath}/requests/${requestId}/status`);

    const config: AxiosRequestConfig = {
      method: 'GET',
      url: `${FAL_QUEUE_URL}/${modelPath}/requests/${requestId}/status`,
      headers: { Authorization: `Key ${apiKey}` },
      timeout: AUTHENTICATED_TIMEOUT,
    };

    const response = await axios(config);
    logger.info(`Queue status response for ${modelPath}, request ${requestId}:`, JSON.stringify(response.data));
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status;
      const responseData = error.response?.data;
      logger.error(`Failed to check queue status [${statusCode}]:`, {
        modelPath,
        requestId,
        error: error.message,
        response: responseData,
        endpoint: `${FAL_QUEUE_URL}/${modelPath}/requests/${requestId}/status`
      });

      if (statusCode === 422) {
        // Attempt to correct case sensitivity in modelPath
        const correctedModelPath = modelPath.replace(/cassetteai/i, 'CassetteAI');
        if (correctedModelPath !== modelPath) {
          logger.warn(`Attempting with corrected model path: ${correctedModelPath}`);
          return await queueStatus(correctedModelPath, requestId);
        }
      }
    } else {
      logger.error('Failed to check queue status (non-Axios error):', error);
    }
    throw error;
  }
}

/**
 * Get the result of a completed request
 * @param modelPath Model path (e.g. "CassetteAI/music-generator")
 * @param requestId Request ID from queue submission
 * @returns Result data
 */
export async function queueResult(modelPath: string, requestId: string): Promise<Record<string, unknown>> {
  try {
    const apiKey = getApiKey();
    logger.info(`Making request to: ${FAL_QUEUE_URL}/${modelPath}/requests/${requestId}`);

    const config: AxiosRequestConfig = {
      method: 'GET',
      url: `${FAL_QUEUE_URL}/${modelPath}/requests/${requestId}`,
      headers: { Authorization: `Key ${apiKey}` },
      timeout: AUTHENTICATED_TIMEOUT,
    };

    const response = await axios(config);
    logger.info(`Queue result response for ${modelPath}, request ${requestId}:`, JSON.stringify(response.data));
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status;
      const responseData = error.response?.data;
      logger.error(`Failed to get queue result [${statusCode}]:`, {
        modelPath,
        requestId,
        error: error.message,
        response: responseData,
        endpoint: `${FAL_QUEUE_URL}/${modelPath}/requests/${requestId}`
      });

      if (statusCode === 422) {
        // Attempt to correct case sensitivity in modelPath
        const correctedModelPath = modelPath.replace(/cassetteai/i, 'CassetteAI');
        if (correctedModelPath !== modelPath) {
          logger.warn(`Attempting with corrected model path: ${correctedModelPath}`);
          return await queueResult(correctedModelPath, requestId);
        }
      }
    } else {
      logger.error('Failed to get queue result (non-Axios error):', error);
    }
    throw error;
  }
}
