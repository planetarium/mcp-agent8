# MCP Server for Agent8

A server implementing the Model Context Protocol (MCP) to support Agent8 SDK development. Developed with TypeScript and pnpm, supporting stdio and SSE transports.

## Features

- Provides various features for Agent8 game server development
- Supports Stdio and SSE transports
- Feature listing and detailed information retrieval
- Supports Agent8 multiplayer game development workflows
- Command-line interface powered by Commander.js

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
