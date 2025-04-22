import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logging.js';
import { V8User } from '../types/v8user.js';

/**`
 * Validates an access token
 * In production, this should call an external authentication service
 */
const verifyAccessToken = async (token: string): Promise<V8User | null> => {
  try {
    // Check if V8_AUTH_API_ENDPOINT is configured
    const apiEndpoint = process.env.V8_AUTH_API_ENDPOINT;
    if (!apiEndpoint) {
      logger.error('V8_AUTH_API_ENDPOINT is not configured');
      throw new Error('V8_AUTH_API_ENDPOINT is not configured');
    }

    // eslint-disable-next-line no-undef
    const response = await fetch(`${apiEndpoint}/verify`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      logger.warn(`Token validation failed: ${response.status} ${response.statusText}`);
      return null;
    }

    // Extract user data from response
    const userData = (await response.json()) as V8User;

    return {
      ...userData,
      accessToken: token,
    };
  } catch (error) {
    logger.error('Error validating token:', error);
    return null;
  }
};

/**
 * Authentication middleware
 * Extracts the token from the request header or query string, validates it, and attaches user info to the request
 */
export const authMiddleware = (options: { checkActivated?: boolean } = {}) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Extract token from header (Bearer scheme)
      const authHeader = req.headers.authorization;
      let accessToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

      // If token not found in header, check query string (e.g., ?accessToken=xxx)
      if (!accessToken && req.query && typeof req.query.accessToken === 'string') {
        accessToken = req.query.accessToken;
      }

      if (!accessToken) {
        res.status(401).json({ error: 'No authentication token provided' });
        return;
      }

      // Validate token
      const userData = await verifyAccessToken(accessToken);
      if (!userData) {
        res.status(401).json({ error: 'Invalid authentication token' });
        return;
      }

      // Check if account is activated (if required)
      if (options.checkActivated && !userData.isActivated) {
        res.status(403).json({ error: 'Account is not activated' });
        return;
      }

      // Attach user info to request
      req.user = userData;

      logger.debug(`Authenticated user: ${userData.email}`);
      next();
    } catch (error) {
      logger.error('Authentication middleware error:', error);
      res.status(500).json({ error: 'Server error while processing authentication' });
    }
  };
};

/**
 * Auth requirement middleware
 * Use this for routes that require authentication
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
};
