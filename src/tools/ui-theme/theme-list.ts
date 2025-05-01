import { Tool, ToolMetadata, ToolResult } from '../types.js';
import { UI_THEME_CATEGORY } from './index.js';
import { loadThemeList } from './loader.js';
import { logger } from '../../utils/logging.js';

/**
 * Theme List Tool - Lists all available UI themes
 */
export class ThemeListTool implements Tool {
  name = 'ui_theme_list';
  description = 'Lists all available UI themes with their descriptions and tags';
  metadata: ToolMetadata = {
    categories: [UI_THEME_CATEGORY]
  };

  inputSchema = {
    type: 'object',
    properties: {
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter themes by tags'
      }
    }
  };

  async execute(args: Record<string, any>): Promise<ToolResult> {
    try {
      const tags = args.tags as string[] || [];
      // Load theme list
      const themeList = await loadThemeList();
      // Filter by tags (if provided)
      let filteredThemes = themeList.themes;
      console.log('filteredThemes', filteredThemes);
      if (tags && tags.length > 0) {
        filteredThemes = filteredThemes.filter((theme: any) =>
          tags.some(tag => theme.tags.includes(tag))
        );
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              themes: filteredThemes,
              count: filteredThemes.length,
              timestamp: themeList.timestamp
            }, null, 2)
          }
        ],
        isError: false
      };
    } catch (error) {
      logger.error('Failed to get theme list:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Failed to get theme list: ${error}`
          }
        ],
        isError: true
      };
    }
  }
}
