import { Tool, ToolMetadata, ToolResult } from '../types.js';
import { UI_THEME_CATEGORY } from './index.js';
import { loadThemeList } from './loader.js';
import { logger } from '../../utils/logging.js';

/**
 * Theme List Tool - Lists all available UI themes
 */
export class ThemeListTool implements Tool {
  name = 'ui_theme_list';
  description = `STEP 1: Lists all available UI themes supported by the system.

This is the FIRST TOOL you should use in the UI theming process. It returns a complete list of UI themes that can be used in your application, including their names, descriptions and tags.

[USAGE SEQUENCE]
1. FIRST: Use this tool (ui_theme_list) to see all available themes
2. NEXT: Choose a theme from the list based on requirements
3. THEN: Use 'ui_theme_style' to get the full definition of your chosen theme
4. OPTIONALLY: Use 'ui_component_style' for specific component styles

[TIPS]
- Use the 'tags' parameter to filter themes (e.g., dark, light, minimal)
- Review the descriptions and tags to find the most suitable theme
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

  async execute(args: Record<string, any>): Promise<ToolResult> {
    try {
      const tags = args.tags as string[] || [];
      // Load theme list
      const themeList = await loadThemeList();
      // Filter by tags (if provided)
      let filteredThemes = themeList.themes;
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
