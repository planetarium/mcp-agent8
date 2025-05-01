import { Tool, ToolMetadata, ToolResult } from '../types.js';
import { UI_THEME_CATEGORY } from './index.js';
import { getComponentStyle } from './loader.js';
import { logger } from '../../utils/logging.js';

/**
 * Component Style Tool - Gets CSS styles for a specific component in a theme
 */
export class ComponentStyleTool implements Tool {
  name = 'ui_component_style';
  description = 'Gets CSS styles for a specific component in a selected theme';
  metadata: ToolMetadata = {
    categories: [UI_THEME_CATEGORY]
  };

  inputSchema = {
    type: 'object',
    properties: {
      theme: {
        type: 'string',
        description: 'Theme name'
      },
      component: {
        type: 'string',
        description: 'Component type, e.g., button, card, input'
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

