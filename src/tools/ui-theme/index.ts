import { ThemeListTool } from './theme-list.js';
import { ThemeStyleTool } from './theme-style.js';
import { ToolCategory } from '../types.js';

export const UI_THEME_CATEGORY = ToolCategory.UI_THEME || 'ui_theme';

export const uiThemeTools = [
  new ThemeListTool(),
  new ThemeStyleTool(),
];

export {
  ThemeListTool,
  ThemeStyleTool,
};
