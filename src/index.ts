#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';
import cors from 'cors';
import { Command } from 'commander';
import { McpServer } from './server.js';
import { logger, LogLevel, LogDestination } from './utils/logging.js';
import path from 'path';

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
      .option('--log-destination <dest>', 'Log destination (stdout, stderr, file, none)', '')
      .option('--log-file <path>', 'Path to log file (when log-destination is file)')
      .option('--log-level <level>', 'Log level (debug, info, warn, error)', 'info');

    program.parse();

    const options = program.opts();

    // Determine log destination based on transport and options
    const logDestination =
      options.logDestination ||
      (options.transport === 'stdio' ? LogDestination.STDERR : LogDestination.STDOUT);

    // Set up logger configuration
    logger.configure({
      level: options.debug ? LogLevel.DEBUG : (options.logLevel as LogLevel) || LogLevel.INFO,
      destination: logDestination as LogDestination,
      filePath: options.logFile ? path.resolve(options.logFile) : undefined,
    });

    // Log debug info
    if (options.debug) {
      logger.debug('Debug mode enabled');
    }

    // Create server
    const server = new McpServer({
      name: 'Agent8 MCP Server',
      version: '1.0.0',
    });

    // Select transport based on arguments
    const transportType = options.transport;

    const sessions: Record<string, { transport: SSEServerTransport; response: express.Response }> =
      {};

    if (transportType === 'sse') {
      const port = parseInt(options.port, 10);
      logger.info(`SSE transport configured, port: ${port}`);

      // Create Express app for SSE transport
      const app = express();
      app.use(cors());
      app.use(express.json());

      // Set up SSE endpoint
      app.get('/sse', async (req, res) => {
        logger.info('New SSE connection established');

        // Configure SSE response headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Create SSE transport
        const transport = new SSEServerTransport('/messages', res);
        await server.connect(transport);

        const sessionId = transport.sessionId;
        if (sessionId) {
          sessions[sessionId] = { transport: transport, response: res };
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
      });

      // Set up message handling endpoint
      app.post('/messages', async (req, res) => {
        const sessionId = req.query.sessionId as string;
        if (!sessionId) {
          logger.error('Missing sessionId parameter');
          res.status(400).send('Missing sessionId parameter');
          return;
        }

        const session = sessions[sessionId];
        if (session?.transport?.handlePostMessage) {
          logger.info(`POST to SSE transport (session ${sessionId})`);
          await session.transport.handlePostMessage(req, res, req.body);
        } else {
          res.status(503).send(`No active SSE connection for session ${sessionId}`);
        }
      });

      // Start Express server
      app.listen(port, () => {
        logger.info(`SSE server listening on port ${port}`);
        logger.info(`SSE endpoint: http://localhost:${port}/sse`);
        logger.info(`Message submission endpoint: http://localhost:${port}/messages`);
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
