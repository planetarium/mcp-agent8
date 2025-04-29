/**
 * Asset Upload Response Interface
 */
export interface AssetUploadResponse {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Asset URL Response Interface
 */
export interface AssetUrlResponse {
  original_url: string;
  agent8_url?: string;
  error?: string;
}
