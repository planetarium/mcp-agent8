import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { logger } from '../../utils/logging.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Theme directory paths
const THEMES_DIR = path.join(__dirname, 'themes-export');
const THEMES_INDEX_PATH = path.join(THEMES_DIR, 'index.json');

let themesCache: any = null;
const componentStyleCache = new Map<string, any>();

/**
 * Load and return the complete list of UI themes
 *
 * This function loads theme metadata from the index.json file in the themes directory.
 * For performance, it caches the results after the first call.
 *
 * @returns {Promise<any>} Theme list object containing themes array and metadata
 * @throws {Error} If themes cannot be loaded from the filesystem
 */
export async function loadThemeList(): Promise<any> {
  try {
    // Use cache to avoid repeated reads
    if (themesCache) {
      return themesCache;
    }
    // Read index.json
    const indexData = fs.readFileSync(THEMES_INDEX_PATH, 'utf-8');
    themesCache = JSON.parse(indexData);
    return themesCache;
  } catch (error) {
    logger.error('Failed to load theme list:', error);
    throw new Error(`Failed to load theme list: ${error}`);
  }
}

/**
 * Load detailed information for a specific theme
 *
 * Retrieves complete theme data including variables, style features, and font mappings
 * from the theme.json file in the theme's directory.
 *
 * @param {string} themeName - Name of the theme to load
 * @returns {Promise<any>} Complete theme data object
 * @throws {Error} If theme does not exist or cannot be loaded
 */
export async function getTheme(themeName: string): Promise<any> {
  try {
    const themePath = path.join(THEMES_DIR, 'themes', themeName, 'theme.json');
    if (fs.existsSync(themePath)) {
      const themeData = fs.readFileSync(themePath, 'utf-8');
      return JSON.parse(themeData);
    }
    throw new Error(`Theme '${themeName}' does not exist`);
  } catch (error) {
    logger.error(`Failed to get theme '${themeName}':`, error);
    throw error;
  }
}

/**
 * Get component-specific styles from a theme
 *
 * Loads the style definition for a specific UI component from the theme's components.json file.
 * Uses caching to improve performance for repeated requests of the same component.
 *
 * @param {string} themeName - Name of the theme
 * @param {string} componentName - Name of the component to get styles for
 * @returns {Promise<any>} Component style object or null if not found
 * @throws {Error} If there's an error reading or parsing the components file
 */
export async function getComponentStyle(
  themeName: string,
  componentName: string
): Promise<any> {
  try {
    // Generate cache key
    const cacheKey = `${themeName}_${componentName}`;

    // Check cache
    if (componentStyleCache.has(cacheKey)) {
      return componentStyleCache.get(cacheKey);
    }

    // Read components.json
    const componentsPath = path.join(THEMES_DIR, 'themes', themeName, 'components.json');
    if (!fs.existsSync(componentsPath)) {
      logger.warn(`Theme '${themeName}' has no components definition file`);
      return null;
    }

    const componentsData = JSON.parse(fs.readFileSync(componentsPath, 'utf-8'));

    // Find component style
    const componentStyle = componentsData[componentName];

    // Cache result
    componentStyleCache.set(cacheKey, componentStyle || null);

    return componentStyle || null;
  } catch (error) {
    logger.error(`Failed to get component style:`, error);
    throw error;
  }
}
