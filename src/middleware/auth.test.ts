import { Request, Response, NextFunction } from 'express';
import { authMiddleware, requireAuth } from './auth.js';
import { V8User } from '../types/v8user.js';
import {jest, describe, expect, beforeEach, afterEach, it} from '@jest/globals';
import fetch, { FetchMock } from 'jest-fetch-mock'

// Workaround for incorrect export on jest-fetch-mock
// See also: https://github.com/jefflau/jest-fetch-mock/issues/251
const mockedFetch = fetch as unknown as FetchMock;

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    // Reset mocks before each test
    mockReq = {
      headers: {},
      query: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis() as jest.MockedFunction<Response['status']>,
      json: jest.fn() as jest.MockedFunction<Response['json']>,
    } as Partial<Response>;
    nextFunction = jest.fn();
    process.env.AUTH_API_ENDPOINT = 'https://test-auth-api.com';
    mockedFetch.enableMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockedFetch.disableMocks();
  });

  describe('verifyAccessToken', () => {
    it('should return user data for valid token', async () => {
      const mockUser: V8User = {
        userUid: '123',
        email: 'test@example.com',
        walletAddress: '0x123',
        isActivated: true,
        accessToken: 'valid-token',
      };

      mockedFetch.mockResponseOnce(JSON.stringify(mockUser));

      const middleware = authMiddleware();
      mockReq.headers = { authorization: 'Bearer valid-token' };

      await middleware(mockReq as Request, mockRes as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockReq.user).toEqual(mockUser);
    });

    it('should return 401 for invalid token', async () => {
      mockedFetch.mockResponseOnce('Unauthorized', { status: 401 });

      const middleware = authMiddleware();
      mockReq.headers = { authorization: 'Bearer invalid-token' };

      await middleware(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid authentication token' });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('authMiddleware', () => {
    it('should accept token from query string', async () => {
      const mockUser: V8User = {
        userUid: '123',
        email: 'test@example.com',
        walletAddress: '0x123',
        isActivated: true,
        accessToken: 'valid-token',
      };

      mockedFetch.mockResponseOnce(JSON.stringify(mockUser));

      const middleware = authMiddleware();
      mockReq.query = { accessToken: 'valid-token' };

      await middleware(mockReq as Request, mockRes as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockReq.user).toEqual(mockUser);
    });

    it('should return 401 when no token provided', async () => {
      const middleware = authMiddleware();

      await middleware(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'No authentication token provided'
      });
    });

    it('should check account activation when required', async () => {
      const mockUser: V8User = {
        userUid: '123',
        email: 'test@example.com',
        walletAddress: '0x123',
        isActivated: false,
        accessToken: 'valid-token',
      };

      mockedFetch.mockResponseOnce(JSON.stringify(mockUser));

      const middleware = authMiddleware({ checkActivated: true });
      mockReq.headers = { authorization: 'Bearer valid-token' };

      await middleware(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Account is not activated' });
    });
  });

  describe('requireAuth', () => {
    it('should allow authenticated requests', () => {
      mockReq.user = {
        userUid: '123',
        email: 'test@example.com',
        walletAddress: '0x123',
        isActivated: true,
        accessToken: 'valid-token',
      };

      requireAuth(mockReq as Request, mockRes as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should block unauthenticated requests', () => {
      requireAuth(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });
});