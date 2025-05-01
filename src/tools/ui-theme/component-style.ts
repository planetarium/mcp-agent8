import { Tool, ToolMetadata, ToolResult } from '../types.js';
import { UI_THEME_CATEGORY } from './index.js';
import { getComponentStyle } from './loader.js';
import { logger } from '../../utils/logging.js';

/**
 * Component Style Tool - Gets CSS styles for a specific component in a theme
 */
export class ComponentStyleTool implements Tool {
  name = 'ui_component_style';
  description = `STEP 3 (OPTIONAL): Retrieves styles for a specific UI component from a selected theme.

This tool can be used AFTER selecting a theme with 'ui_theme_list', either instead of or in addition to 'ui_theme_style' when you only need styles for specific components.

[USAGE SEQUENCE]
1. FIRST: Use 'ui_theme_list' to see all available themes and select one
2. THEN: Either use 'ui_theme_style' for the full theme, OR
3. Use this tool (ui_component_style) for specific component styles

[KEY FEATURES]
- Provides focused styling for individual UI components
- Returns only the styles needed for a specific component type
- Works with all available UI themes in the system

[COMMON COMPONENT TYPES]
- button: Basic button styles
- card: Container/card element styles
- input: Form input field styles
- modal: Modal/dialog styles
- navbar: Navigation bar styles
- sidebar: Side navigation panel styles
- toggle: Toggle/switch control styles
- dropdown: Dropdown menu styles
- tab: Tab navigation styles

[TIPS]
- Use the exact theme name from 'ui_theme_list' results
- Be specific about the component type you need
- Check the 'found' property to verify if styles were found
- This tool is ideal when you only need styles for specific elements`;

  metadata: ToolMetadata = {
    categories: [UI_THEME_CATEGORY]
  };

  inputSchema = {
    type: 'object',
    properties: {
      theme: {
        type: 'string',
        description: 'Theme name (e.g., default, dark, neon-arcade, space-tech)'
      },
      component: {
        type: 'string',
        description: 'Component type (e.g., button, card, input, modal, navbar)'
      }
    },
    required: ['theme', 'component']
  };

  async execute(args: Record<string, any>): Promise<ToolResult> {
    try {
      const theme = args.theme as string;
      const component = args.component as string;

      if (!theme || !component) {
        throw new Error('Theme name and component type cannot be empty');
      }

      const styles = await getComponentStyle(theme, component);

      if (!styles) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              message: `No styles found for component '${component}' in theme '${theme}'`,
              found: false
            }, null, 2)
          }],
          isError: false
        };
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            theme,
            component,
            styles,
            found: true
          }, null, 2)
        }],
        isError: false
      };
    } catch (error: any) {
      logger.error('Failed to get component style:', error);
      return {
        content: [{
          type: 'text',
          text: `Error: ${error.message || String(error)}`
        }],
        isError: true
      };
    }
  }
}

