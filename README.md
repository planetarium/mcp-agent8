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
| MCP_PORT                  | Port to use for SSE transport                   | 3000                                                     |
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
