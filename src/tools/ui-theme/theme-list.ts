import { Tool, ToolMetadata, ToolResult } from '../types.js';
import { UI_THEME_CATEGORY } from './index.js';
import { loadThemeList } from './loader.js';
import { ThemeList, Theme } from './types.js';
import { logger } from '../../utils/logging.js';

let themeList: ThemeList | null = null;

loadThemeList().then(list => {
  themeList = list;
  logger.info(`Successfully loaded ${themeList.themes.length} themes`);
}).catch(err => {
  logger.error('Theme list initialization failed:', err);
  themeList = { themes: [] };
});

/**
 * Theme List Tool - Lists all available UI themes
 */
export class ThemeListTool implements Tool {
  name = 'ui_theme_list';
  description = `STEP 1: Lists all available UI themes supported by the system.

This is the FIRST TOOL you should use in the UI theming process.

[USAGE SEQUENCE]
1. FIRST: Use this tool (ui_theme_list) to see all available themes
2. NEXT: Choose a theme from the list based on requirements
3. THEN: Use 'ui_theme_style' to get the full definition of your chosen theme

[TIPS]
- Use the 'tags' parameter to filter themes (e.g., dark, light, minimal)
- Note the exact theme name (e.g., 'neon-arcade', 'space-tech') for next steps
- Common tags include: light, dark, minimal, futuristic, retro, and rounded`;

  metadata: ToolMetadata = {
    categories: [UI_THEME_CATEGORY]
  };

  inputSchema = {
    type: 'object',
    properties: {
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter themes by tags (e.g., dark, light, minimal, vibrant, futuristic, retro)'
      }
    }
  };

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const tags = Array.isArray(args.tags) ? (args.tags as string[]) : [];
      // Filter by tags (if provided)
      if (!themeList) {
        throw new Error('Theme list not available');
      }

      let filteredThemes: Theme[] = themeList.themes;
      if (tags && tags.length > 0) {
        filteredThemes = filteredThemes.filter((theme: Theme) =>
          tags.some(tag => theme.tags && theme.tags.includes(tag))
        );
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              themes: filteredThemes,
              count: filteredThemes.length
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
