import { Tool, ToolMetadata, ToolResult } from '../types.js';
import { UI_THEME_CATEGORY } from './index.js';
import { getTheme } from './loader.js';
import { logger } from '../../utils/logging.js';

/**
 * Theme Style Tool - Gets complete theme style variables
 */
export class ThemeStyleTool implements Tool {
  name = 'ui_theme_style';
  description = `STEP 2: Gets complete style variables and CSS definition for a specific UI theme.

This tool should be used AFTER selecting a theme using the 'ui_theme_list' tool. It provides the comprehensive style definition for the chosen theme.

[USAGE SEQUENCE]
1. FIRST: Use 'ui_theme_list' to see all available themes and select one
2. THEN: Use this tool (ui_theme_style) with your chosen theme name

[KEY FEATURES]
- Returns all theme variables in a structured format
- Includes complete color schemes and styling specifications

[RETURNED DATA]
- variables: Complete set of theme variables (colors, radius, etc.)
- styleFeatures: Common style patterns used in the theme
- fontMappings: Typography settings for different text elements`;

  metadata: ToolMetadata = {
    categories: [UI_THEME_CATEGORY]
  };

  inputSchema = {
    type: 'object',
    properties: {
      theme: {
        type: 'string',
        description: 'Theme name to get style for (e.g., default, dark, neon-arcade, space-tech)'
      }
    },
    required: ['theme']
  };

  async execute(args: Record<string, any>): Promise<ToolResult> {
    try {
      const themeName = args.theme as string;

      if (!themeName) {
        throw new Error('Theme name cannot be empty');
      }

      // Get theme data
      const themeData = await getTheme(themeName);

      if (!themeData) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: `Theme '${themeName}' not found`,
                found: false
              }, null, 2)
            }
          ],
          isError: false
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              theme: themeName,
              variables: themeData.variables,
              styleFeatures: themeData.styleFeatures,
              fontMappings: themeData.fontMappings,
              found: true
            }, null, 2)
          }
        ],
        isError: false
      };
    } catch (error) {
      logger.error('Failed to get theme style:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Failed to get theme style: ${error}`
          }
        ],
        isError: true
      };
    }
  }
}
