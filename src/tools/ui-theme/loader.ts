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
 * Load theme list
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
 * Get specific theme information
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
 * Get component style
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
