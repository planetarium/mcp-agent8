# MCP Server for Agent8

A server implementing the Model Context Protocol (MCP) to support Agent8 SDK development. Developed with TypeScript and pnpm, supporting stdio and SSE transports.

## Features

This Agent8 MCP Server implements the following MCP specification capabilities:

### Prompts

- **System Prompt for Agent8 SDK**: Provides optimized guidelines for Agent8 SDK development through the `system-prompt-for-agent8-sdk` prompt template.

### Tools

- **Code Examples Search**: Retrieves relevant Agent8 game development code examples from a vector database using the `search_code_examples` tool.

## Installation

```bash
# Install dependencies
pnpm install

# Build
pnpm build
```

### Using Docker

You can run this application using Docker in several ways:

#### Option 1: Pull from GitHub Container Registry (Recommended)

```bash
# Pull the latest image
docker pull ghcr.io/planetarium/mcp-agent8:latest

# Run the container
docker run -p 3333:3333 --env-file .env ghcr.io/planetarium/mcp-agent8:latest
```

#### Option 2: Build Locally

```bash
# Build the Docker image
docker build -t agent8-mcp-server .

# Run the container with environment variables
docker run -p 3333:3333 --env-file .env agent8-mcp-server
```

#### Docker Environment Configuration

There are three ways to configure environment variables when running with Docker:

1. Using `--env-file` (Recommended):

   ```bash
   # Create and configure your .env file first
   cp .env.example .env
   nano .env

   # Run with .env file
   docker run -p 3000:3000 --env-file .env agent8-mcp-server
   ```

2. Using individual `-e` flags:

   ```bash
   docker run -p 3000:3000 \
     -e SUPABASE_URL=your_supabase_url \
     -e SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
     -e OPENAI_API_KEY=your_openai_api_key \
     -e MCP_TRANSPORT=sse \
     -e PORT=3000 \
     -e LOG_LEVEL=info \
     agent8-mcp-server
   ```

3. Using Docker Compose (for development/production setup):

   The project includes a pre-configured `docker-compose.yml` file with:

   - Automatic port mapping from .env configuration
   - Environment variables loading
   - Volume mounting for data persistence
   - Container auto-restart policy
   - Health check configuration

   To run the server:

   ```bash
   docker compose up
   ```

   To run in detached mode:

   ```bash
   docker compose up -d
   ```

**Required Environment Variables:**

- `SUPABASE_URL`: Supabase URL for database connection
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key for authentication
- `OPENAI_API_KEY`: OpenAI API key for AI functionality

The Dockerfile uses a multi-stage build process to create a minimal production image:

- Uses Node.js 20 Alpine as the base image for smaller size
- Separates build and runtime dependencies
- Only includes necessary files in the final image
- Exposes port 3000 by default

## Usage

### Command Line Options

```bash
# View help
pnpm start --help

# View version information
pnpm start --version
```

Supported options:

- `--debug`: Enable debug mode
- `--transport <type>`: Transport type (stdio or sse), default: stdio
- `--port <number>`: Port to use for SSE transport, default: 3000
- `--log-destination <dest>`: Log destination (stdout, stderr, file, none)
- `--log-file <path>`: Path to log file (when log-destination is file)
- `--log-level <level>`: Log level (debug, info, warn, error), default: info
- `--env-file <path>`: Path to .env file

### Using Environment Variables

The server supports configuration via environment variables, which can be set directly or via a `.env` file.

1. Create a `.env` file in the project root (see `.env.example` for reference):

```bash
# Copy the example file
cp .env.example .env

# Edit the .env file with your settings
nano .env
```

2. Run the server (it will automatically load the `.env` file):

```bash
pnpm start
```

3. Or specify a custom path to the `.env` file:

```bash
pnpm start --env-file=/path/to/custom/.env
```

#### Configuration Priority

The server uses the following priority order when determining configuration values:

1. Command line arguments (highest priority)
2. Environment variables (from `.env` file or system environment)
3. Default values (lowest priority)

This allows you to set baseline configuration in your `.env` file while overriding specific settings via command line arguments when needed.

#### Supported Environment Variables

| Variable                  | Description                                     | Default                                                  |
| ------------------------- | ----------------------------------------------- | -------------------------------------------------------- |
| MCP_TRANSPORT             | Transport type (stdio or sse)                   | stdio                                                    |
| PORT                      | Port to use for SSE transport                   | 3000                                                     |
| LOG_LEVEL                 | Log level (debug, info, warn, error)            | info                                                     |
| LOG_DESTINATION           | Log destination (stdout, stderr, file, none)    | stderr (for stdio transport), stdout (for sse transport) |
| LOG_FILE                  | Path to log file (when LOG_DESTINATION is file) | (none)                                                   |
| DEBUG                     | Enable debug mode (true/false)                  | false                                                    |
| SUPABASE_URL              | Supabase URL for database connection            | (required)                                               |
| SUPABASE_SERVICE_ROLE_KEY | Supabase service role key for authentication    | (required)                                               |
| OPENAI_API_KEY            | OpenAI API key for AI functionality             | (required)                                               |

### Using Stdio Transport

```bash
# Build and run
pnpm build
pnpm start --transport=stdio
```

### Using SSE Transport

```bash
# Build and run (default port: 3000)
pnpm build
pnpm start --transport=sse --port=3000
```

### Debug Mode

```bash
# Run in debug mode
pnpm start --debug
```

## Available Prompts

- `systemprompt-agent8-sdk`

## Client Integration

### Using with Claude Desktop

1. Add the following to Claude Desktop configuration file (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "Agent8": {
      "command": "npx",
      "args": ["--yes", "agent8-mcp-server"]
    }
  }
}
```

1. Restart Claude Desktop

### Adding New Prompts

Add new prompts to the `registerSamplePrompts` method in the `src/prompts/provider.ts` file.

## License

MIT
