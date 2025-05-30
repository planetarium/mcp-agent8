import { Tool, ToolMetadata, ToolResult } from '../types.js';
import { UI_THEME_CATEGORY } from './index.js';
import { getTheme } from './loader.js';
import { logger } from '../../utils/logging.js';
import { Theme } from './types.js';

/**
 * Theme Style Tool - Gets complete theme style variables
 */
export class ThemeStyleTool implements Tool {
  name = 'ui_theme_style';
  description = `STEP 2: Gets complete UI theme configuration with CSS variables, component styles, and fonts.

Data Structure

":root" - Global CSS variables (MOST IMPORTANT)
- Must be placed in CSS :root selector for global access
- Values are raw HSL format (without hsl() wrapper)
- Usage: hsl(var(--variable-name)) with optional transparency hsl(var(--primary) / 0.5)
:root {
  --background: 210 30% 12%;
  --primary: 190 100% 50%;
  --foreground: 210 40% 98%;
}

"styleFeatures" - Component style patterns to copy into CSS classes
body { background: hsl(var(--background)); }
.button { background: hsl(var(--primary) / 0.3); }

"fonts" - Theme-matching font system with Google Fonts resources
- Use googleFonts URLs in HTML <link> tags (recommended for performance)
- Or use imports at top of CSS files for quick prototyping
- Apply fonts with font-family: 'Font Name', fallback

CRITICAL: :root variables must be defined globally to work across all components.`;

  metadata: ToolMetadata = {
    categories: [UI_THEME_CATEGORY]
  };

  inputSchema = {
    type: 'object',
    properties: {
      theme: {
        type: 'string',
        description: 'Theme name to get style for (e.g., default, dark, neon-arcade, space-tech, super-retro)'
      }
    },
    required: ['theme']
  };

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const themeName = args.theme as string;

      if (!themeName) {
        throw new Error('Theme name cannot be empty');
      }

      const themeData: Theme = await getTheme(themeName);

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

      const result = {
        name: themeData.name,
        displayName: themeData.displayName,
        description: themeData.description,
        tags: themeData.tags,
        ":root": themeData[":root"] || {},
        styleFeatures: themeData.styleFeatures || {},
        fonts: this.processFonts(themeData.fonts),
        found: true
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
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

  private processFonts(fonts?: Theme['fonts']) {
    if (!fonts || Object.keys(fonts).length === 0) {
      return {
        body: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        headings: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        accent: "ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace",
        buttons: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        resources: {
          googleFonts: [],
          imports: []
        }
      };
    }

    return {
      body: fonts.body || "system-ui, -apple-system, sans-serif",
      headings: fonts.headings || fonts.body || "system-ui, -apple-system, sans-serif",
      accent: fonts.accent || "monospace, 'Courier New'",
      buttons: fonts.buttons || fonts.headings || fonts.body || "system-ui, -apple-system, sans-serif",
      resources: {
        googleFonts: fonts.resources?.googleFonts || [],
        imports: fonts.resources?.imports || []
      }
    };
  }
}
