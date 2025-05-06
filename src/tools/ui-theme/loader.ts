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
const themeDataCache = new Map<string, any>();

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
 * For performance, it caches the results after the first call for each theme.
 *
 * @param {string} themeName - Name of the theme to load
 * @returns {Promise<any>} Complete theme data object
 * @throws {Error} If theme does not exist or cannot be loaded
 */
export async function getTheme(themeName: string): Promise<any> {
  try {
    if (themeDataCache.has(themeName)) {
      return themeDataCache.get(themeName);
    }

    const themePath = path.join(THEMES_DIR, 'themes', themeName, 'theme.json');
    if (fs.existsSync(themePath)) {
      const themeData = fs.readFileSync(themePath, 'utf-8');
      const parsedData = JSON.parse(themeData);

      themeDataCache.set(themeName, parsedData);

      return parsedData;
    }
    throw new Error(`Theme '${themeName}' does not exist`);
  } catch (error) {
    logger.error(`Failed to get theme '${themeName}':`, error);
    throw error;
  }
}

