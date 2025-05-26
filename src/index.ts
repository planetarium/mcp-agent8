#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import cors from 'cors';
import { Command } from 'commander';
import { McpServer } from './server.js';
import { logger, LogLevel, LogDestination } from './utils/logging.js';
import { env } from './utils/env.js';
import path from 'path';
import { authMiddleware } from './middleware/auth.js';
import { randomUUID } from 'node:crypto';

/**
 * HTTP request/response logging middleware
 * Logs detailed request and response information at debug level
 */
const httpLoggingMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const startTime = Date.now();
  const requestId = randomUUID();

  // Log request details
  logger.debug(`[HTTP][${requestId}] Request:`, {
    method: req.method,
    url: req.originalUrl,
    params: req.params,
    query: req.query,
    headers: req.headers,
    body: req.body,
    ip: req.ip
  });

  // Save original response methods to intercept
  const originalSend = res.send;
  const originalJson = res.json;

  // Capture response body
  let responseBody: unknown;

  // Override send
  res.send = function (body: unknown) {
    responseBody = body;
    return originalSend.call(this, body);
  };

  // Override json
  res.json = function (body: unknown) {
    responseBody = body;
    return originalJson.call(this, body);
  };

  // Listen for finish event to log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    logger.debug(`[HTTP][${requestId}] Response:`, {
      statusCode: res.statusCode,
      statusMessage: res.statusMessage,
      headers: res.getHeaders(),
      body: responseBody,
      responseTime: duration
    });
  });

  // Continue to next middleware
  next();
};

/**
 * Parse transport types from comma-separated string
 */
function parseTransports(transportsStr: string): string[] {
  return transportsStr
    .split(',')
    .map(t => t.trim().toLowerCase())
    .filter(t => ['stdio', 'sse', 'streamable-http'].includes(t));
}

/**
 * Create SSE connection handler
 */
function createSseConnectionHandler(
  server: McpServer,
  sessions: Record<string, SSEServerTransport>
) {
  return async (req: express.Request, res: express.Response) => {
    // Configure SSE response headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Content-Encoding', 'none');

    // Create SSE transport
    const transport = new SSEServerTransport('/messages', res);
    await server.connect(transport);

    // Log authenticated user info if available
    if (req.user) {
      logger.info(`New SSE connection established for user: ${req.user.email}, sessionId: ${transport.sessionId}`);
    } else {
      logger.info('New SSE connection established, sessionId: ' + transport.sessionId);
    }

    const sessionId = transport.sessionId;
    if (sessionId) {
      sessions[sessionId] = transport;
    }

    transport.onclose = () => {
      logger.info(`SSE connection closed (session ${sessionId})`);
      delete sessions[sessionId];
    };

    transport.onerror = (err) => {
      logger.error(`SSE error (session ${sessionId}):`, err);
      delete sessions[sessionId];
    };

    req.on('close', () => {
      logger.info(`Client disconnected (session ${sessionId})`);
      delete sessions[sessionId];
    });
  };
}

/**
 * Create SSE message handler
 */
function createSseMessageHandler(sessions: Record<string, SSEServerTransport>) {
  return async (req: express.Request, res: express.Response) => {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) {
      logger.error('Missing sessionId parameter');
      res.status(400).send('Missing sessionId parameter');
      return;
    }

    const session = sessions[sessionId];
    if (session?.handlePostMessage) {
      // Log authenticated user info if available
      if (req.user) {
        logger.info(`POST to SSE transport from user: ${req.user.email} (session ${sessionId})`);
      } else {
        logger.info(`POST to SSE transport (session ${sessionId})`);
      }

      if (!req.body.params) {
        req.body.params = {};
      }

      req.body.params._user = req.user;

      await session.handlePostMessage(req, res, req.body);
    } else {
      res.status(503).send(`No active SSE connection for session ${sessionId}`);
    }
  };
}

/**
 * Create HTTP POST handler for streamable-http transport
 */
function createHttpPostHandler(
  server: McpServer,
  httpSessions: Record<string, StreamableHTTPServerTransport>
) {
  return async (req: express.Request, res: express.Response) => {
    // Check for existing session ID
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && httpSessions[sessionId]) {
      // Reuse existing transport
      transport = httpSessions[sessionId];
      // Log authenticated user info if available
      if (req.user) {
        logger.info(`POST to HTTP transport from user: ${req.user.email} (session ${sessionId})`);
        // Add user information to request params
        if (!req.body.params) {
          req.body.params = {};
        }
        req.body.params._user = req.user;
      } else {
        logger.info(`POST to HTTP transport (session ${sessionId})`);
      }
    } else if (!sessionId && isInitializeRequest(req.body)) {
      // New initialization request
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (newSessionId) => {
          // Store the transport by session ID
          httpSessions[newSessionId] = transport;
          // Log authenticated user info if available
          if (req.user) {
            logger.info(`New HTTP connection established for user: ${req.user.email}, sessionId: ${newSessionId}`);
          } else {
            logger.info(`New HTTP connection established, sessionId: ${newSessionId}`);
          }
        }
      });

      // Clean up transport when closed
      transport.onclose = () => {
        if (transport.sessionId) {
          logger.info(`HTTP connection closed (session ${transport.sessionId})`);
          delete httpSessions[transport.sessionId];
        }
      };

      transport.onerror = (err) => {
        if (transport.sessionId) {
          logger.error(`HTTP error (session ${transport.sessionId}):`, err);
          delete httpSessions[transport.sessionId];
        }
      };

      await server.connect(transport);
    } else {
      // Invalid request
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: No valid session ID provided',
        },
        id: null,
      });
      return;
    }

    // Handle the request
    await transport.handleRequest(req, res, req.body);
  };
}

/**
 * Create HTTP session handler for GET and DELETE requests
 */
function createHttpSessionHandler(httpSessions: Record<string, StreamableHTTPServerTransport>) {
  return async (req: express.Request, res: express.Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !httpSessions[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }
    const transport = httpSessions[sessionId];
    // Log authenticated user info if available
    if (req.user) {
      logger.info(`${req.method} to HTTP transport from user: ${req.user.email} (session ${sessionId})`);
    } else {
      logger.info(`${req.method} to HTTP transport (session ${sessionId})`);
    }
    await transport.handleRequest(req, res);
  };
}

/**
 * Start unified HTTP server supporting both SSE and streamable-http transports
 */
async function startUnifiedHttpServer(
  server: McpServer,
  transports: string[],
  port: number,
  requireAuth: boolean
): Promise<void> {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(httpLoggingMiddleware);

  // SSE transport setup
  if (transports.includes('sse')) {
    const sseSessions: Record<string, SSEServerTransport> = {};

    const sseConnectionHandler = createSseConnectionHandler(server, sseSessions);
    const sseMessageHandler = createSseMessageHandler(sseSessions);

    // Apply authentication middleware if required
    if (requireAuth) {
      app.get('/sse', authMiddleware({ checkActivated: true }), sseConnectionHandler);
      app.post('/messages', authMiddleware(), sseMessageHandler);
    } else {
      app.get('/sse', sseConnectionHandler);
      app.post('/messages', sseMessageHandler);
    }
  }

  // Streamable-HTTP transport setup
  if (transports.includes('streamable-http')) {
    const httpSessions: Record<string, StreamableHTTPServerTransport> = {};

    const httpPostHandler = createHttpPostHandler(server, httpSessions);
    const httpSessionHandler = createHttpSessionHandler(httpSessions);

    // Apply authentication middleware if required
    if (requireAuth) {
      app.post('/mcp', authMiddleware(), httpPostHandler);
      app.get('/mcp', authMiddleware(), httpSessionHandler);
      app.delete('/mcp', authMiddleware(), httpSessionHandler);
    } else {
      app.post('/mcp', httpPostHandler);
      app.get('/mcp', httpSessionHandler);
      app.delete('/mcp', httpSessionHandler);
    }
  }

  return new Promise((resolve) => {
    app.listen(port, () => {
      logger.info(`Unified HTTP server listening on port ${port}`);

      if (transports.includes('sse')) {
        logger.info(`SSE endpoint: http://localhost:${port}/sse`);
        logger.info(`SSE message submission endpoint: http://localhost:${port}/messages`);
      }

      if (transports.includes('streamable-http')) {
        logger.info(`Stremable-HTTP endpoint: http://localhost:${port}/mcp`);
      }

      if (requireAuth) {
        logger.info('Authentication required. Provide a Bearer token in the Authorization header.');
      }

      resolve();
    });
  });
}

/**
 * Start stdio transport
 */
async function startStdioServer(server: McpServer): Promise<void> {
  logger.info('Using Stdio transport');
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('Server has started. Press Ctrl+C to exit.');
}

/**
 * Main Entry Point
 * Starts the MCP server with support for multiple transports
 */
async function main() {
  try {
    // Parse command line arguments using Commander
    const program = new Command();

    program
      .name('agent8-mcp-server')
      .description('Agent8 MCP Server')
      .version('1.0.0')
      .option('--debug', 'Enable debug mode')
      .option('--transports <types>', 'Transport methods (comma-separated: stdio,sse,streamable-http)', 'stdio')
      .option('--port <number>', 'Port to use for HTTP-based transports (sse, streamable-http)', '3000')
      .option(
        '--log-destination <dest>',
        'Log destination (stdout, stderr, file, none) (defaults to stderr for stdio transport, stdout for http transports)'
      )
      .option('--log-file <path>', 'Path to log file (when log-destination is file)')
      .option('--log-level <level>', 'Log level (debug, info, warn, error)', 'info')
      .option('--env-file <path>', 'Path to .env file')
      .option('--auth-api-endpoint <url>', 'Authentication API endpoint URL')
      .option('--require-auth', 'Require authentication for API endpoints');

    program.parse();

    const options = program.opts();

    // Load environment variables (.env file)
    env.load(options.envFile);

    // Check if options were explicitly provided in command line
    const hasExplicitTransports = process.argv.includes('--transports');
    const hasExplicitPort = process.argv.includes('--port');
    const hasExplicitLogLevel = process.argv.includes('--log-level');

    // Read settings from environment variables with proper fallback logic
    const transportsStr = hasExplicitTransports
      ? options.transports
      : env.get('MCP_TRANSPORTS', 'stdio');

    const portStr = hasExplicitPort ? options.port : env.get('PORT', '3000');

    const port = parseInt(portStr, 10);

    const isDebugMode = options.debug || env.getBoolean('DEBUG', false);

    const logLevelStr = hasExplicitLogLevel ? options.logLevel : env.get('LOG_LEVEL', 'info');

    const logLevel = logLevelStr as LogLevel;

         // Parse transports
     const transports = parseTransports(transportsStr);

     if (transports.length === 0) {
       throw new Error('No valid transports specified. Valid options: stdio, sse, streamable-http');
     }

    // Check if option was explicitly provided
    const hasExplicitLogDestination = process.argv.includes('--log-destination');

    // Determine log destination based on transport and options
    const hasHttpTransports = transports.some(t => t === 'sse' || t === 'streamable-http');
    const logDestination = hasExplicitLogDestination
      ? options.logDestination
      : env.get('LOG_DESTINATION') ||
      (transports.includes('stdio') && !hasHttpTransports ? LogDestination.STDERR : LogDestination.STDOUT);

    // Log file path
    const logFilePath = options.logFile || env.get('LOG_FILE');

    // Authentication related settings
    const authApiEndpoint = options.authApiEndpoint || env.get('V8_AUTH_API_ENDPOINT');
    // Automatically disable authentication if API endpoint is not set
    let requireAuth = options.requireAuth || env.getBoolean('V8_AUTH_REQUIRE', false);

    // If auth API endpoint is not set, disable authentication regardless of settings
    if (!authApiEndpoint && requireAuth) {
      logger.warn('Authentication API endpoint not set. Disabling authentication.');
      requireAuth = false;
    } else if (requireAuth) {
      logger.info('Authentication is enabled');
    } else {
      logger.info('Authentication is disabled');
    }

    if (authApiEndpoint) {
      process.env.V8_AUTH_API_ENDPOINT = authApiEndpoint;
    }

    // Set up logger configuration
    logger.configure({
      level: isDebugMode ? LogLevel.DEBUG : logLevel || LogLevel.INFO,
      destination: logDestination as LogDestination,
      filePath: logFilePath ? path.resolve(logFilePath) : undefined,
    });

    // Log debug info
    if (isDebugMode) {
      logger.debug('Debug mode enabled');
    }

    logger.info(`Starting MCP server with transports: ${transports.join(', ')}`);

    // Create server
    const server = new McpServer({
      name: 'Agent8 MCP Server',
      version: '1.0.0',
    });

    // Start servers based on configured transports
    const serverPromises: Promise<void>[] = [];

    // Start HTTP-based transports (SSE and/or streamable-http)
    const httpTransports = transports.filter(t => t === 'sse' || t === 'streamable-http');
    if (httpTransports.length > 0) {
      serverPromises.push(startUnifiedHttpServer(server, httpTransports, port, requireAuth));
    }

    // Start stdio transport
    if (transports.includes('stdio')) {
      serverPromises.push(startStdioServer(server));
    }

    // Wait for all servers to start
    await Promise.all(serverPromises);

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  logger.info('SIGINT signal received, shutting down...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received, shutting down...');
  process.exit(0);
});

// Start the server
main();
