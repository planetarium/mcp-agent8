#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';
import cors from 'cors';
import { Command } from 'commander';
import { McpServer } from './server.js';
import { logger, LogLevel, LogDestination } from './utils/logging.js';
import { env } from './utils/env.js';
import path from 'path';
import { authMiddleware } from './middleware/auth.js';

/**
 * Main Entry Point
 * Starts the MCP server.
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
      .option('--transport <type>', 'Transport method (stdio or sse)', 'stdio')
      .option('--port <number>', 'Port to use for SSE transport', '3000')
      .option(
        '--log-destination <dest>',
        'Log destination (stdout, stderr, file, none) (defaults to stderr for stdio transport, stdout for sse transport)'
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
    const hasExplicitTransport = process.argv.includes('--transport');
    const hasExplicitPort = process.argv.includes('--port');
    const hasExplicitLogLevel = process.argv.includes('--log-level');

    // Read settings from environment variables with proper fallback logic
    const transportType = hasExplicitTransport
      ? options.transport
      : env.get('MCP_TRANSPORT', 'stdio');

    const portStr = hasExplicitPort ? options.port : env.get('PORT', '3000');

    const port = parseInt(portStr, 10);

    const isDebugMode = options.debug || env.getBoolean('DEBUG', false);

    const logLevelStr = hasExplicitLogLevel ? options.logLevel : env.get('LOG_LEVEL', 'info');

    const logLevel = logLevelStr as LogLevel;

    // Check if option was explicitly provided
    const hasExplicitLogDestination = process.argv.includes('--log-destination');

    // Determine log destination based on transport and options
    const logDestination = hasExplicitLogDestination
      ? options.logDestination
      : env.get('LOG_DESTINATION') ||
      (transportType === 'stdio' ? LogDestination.STDERR : LogDestination.STDOUT);

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

    // Create server
    const server = new McpServer({
      name: 'Agent8 MCP Server',
      version: '1.0.0',
    });

    const sessions: Record<string, SSEServerTransport> = {};

    if (transportType === 'sse') {
      logger.info(`SSE transport configured, port: ${port}`);

      // Create Express app for SSE transport
      const app = express();
      app.use(cors());
      app.use(express.json());

      // Extract SSE connection handler function to avoid duplication
      const handleSseConnection = async (req: express.Request, res: express.Response) => {
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

      // Extract message handling function to avoid duplication
      const handleMessagePost = async (req: express.Request, res: express.Response) => {
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

      // Apply appropriate middleware based on authentication requirements
      if (requireAuth) {
        logger.info('Authentication middleware activated');
        app.get('/sse', authMiddleware({ checkActivated: true }), handleSseConnection);
        app.post('/messages', authMiddleware(), handleMessagePost);
      } else {
        app.get('/sse', handleSseConnection);
        app.post('/messages', handleMessagePost);
      }

      // Start Express server
      app.listen(port, () => {
        logger.info(`SSE server listening on port ${port}`);
        logger.info(`SSE endpoint: http://localhost:${port}/sse`);
        logger.info(`Message submission endpoint: http://localhost:${port}/messages`);
        if (requireAuth) {
          logger.info('Authentication required. Provide a Bearer token in the Authorization header.');
        }
      });
    } else {
      // Use stdio transport
      logger.info('Using Stdio transport');
      const transport = new StdioServerTransport();
      await server.connect(transport);
      logger.info('Server has started. Press Ctrl+C to exit.');
    }
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
