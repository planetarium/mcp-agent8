import { AssetGeneratorBase } from '../asset-generate/common/types.js';
import { TOOL_TYPE_SKYBOX_GENERATION } from './constants.js';

/**
 * Skybox Generator Base class
 * Extends AssetGeneratorBase with Skybox specific functionality
 */
export abstract class SkyboxGeneratorBase extends AssetGeneratorBase {
  protected getToolType(): string {
    return TOOL_TYPE_SKYBOX_GENERATION;
  }
}

/**
 * Response from Skybox generation API
 */
export interface SkyboxGenerationResponse {
  id: number;
  status: string;
  queue_position: number;
  file_url: string;
  thumb_url: string;
  title: string;
  user_id: number;
  username: string;
  error_message: string | null;
  obfuscated_id: string;
  pusher_channel: string;
  pusher_event: string;
  created_at: string;
  updated_at: string;
  depth_map_url?: string;
}

/**
 * Status response from Skybox API
 */
export interface SkyboxStatusResponse {
  skybox_id: number;
  status: 'pending' | 'dispatched' | 'processing' | 'complete' | 'abort' | 'error';
  file_url?: string;
  thumb_url?: string;
  depth_map_url?: string;
  error_message?: string;
  queue_position?: number;
  updated_at: string;
  is_complete: boolean;
}

/**
 * Skybox Style information
 */
export interface SkyboxStyle {
  id: number;
  name: string;
  "max-char": number;
  "negative-text-max-char": number;
  image: string;
  sort_order: number;
  model: string;
  model_version: string;
  description?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Response from Skybox Styles API
 */
export type SkyboxStylesResponse = SkyboxStyle[];
