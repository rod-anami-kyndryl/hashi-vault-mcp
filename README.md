# HashiCorp Vault MCP Server

A Model Context Protocol (MCP) server that provides tools for interacting with HashiCorp Vault via HTTP/SSE API.

## Features

This MCP server provides the following tools for Vault operations:

- **vault_read**: Read secrets from Vault at a specified path
- **vault_write**: Write secrets to Vault at a specified path
- **vault_list**: List secrets at a specified path
- **vault_delete**: Delete secrets from Vault at a specified path

## Installation

```bash
npm install
npm run build
```

## Prerequisites

This server uses the `hashi-vault-js` library to communicate with HashiCorp Vault. Make sure you have:

- Node.js 18 or later
- A running HashiCorp Vault server
- A valid Vault authentication token

## Configuration

The server requires the following environment variables:

- `VAULT_ADDR`: The address of your Vault server (default: `http://127.0.0.1:8200`)
- `VAULT_TOKEN`: Your Vault authentication token
- `PORT`: The port for the MCP server API (default: `3000`)

## Usage

### Running the Server

```bash
export VAULT_ADDR="http://127.0.0.1:8200"
export VAULT_TOKEN="your-vault-token"
export PORT=3000
node dist/index.js
```

The server will start and expose the following endpoints:

- `http://localhost:3000/health` - Health check endpoint
- `http://localhost:3000/sse` - SSE endpoint for MCP client connections
- `http://localhost:3000/message` - Message endpoint for client requests

### Using with Claude Desktop

Add this configuration to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "vault": {
      "url": "http://localhost:3000/sse"
    }
  }
}
```

Note: Make sure the server is running before starting Claude Desktop.

### Using with MCP Clients

Connect to the SSE endpoint at `http://localhost:3000/sse` using any MCP-compatible client. The server uses Server-Sent Events (SSE) for real-time communication.

## Tool Examples

### Reading a Secret

```typescript
// Tool: vault_read
// Arguments:
{
  "path": "secret/data/myapp/config"
}
```

### Writing a Secret

```typescript
// Tool: vault_write
// Arguments:
{
  "path": "secret/data/myapp/config",
  "data": {
    "data": {
      "username": "admin",
      "password": "secret123"
    }
  }
}
```

### Listing Secrets

```typescript
// Tool: vault_list
// Arguments:
{
  "path": "secret/metadata/myapp"
}
```

### Deleting a Secret

```typescript
// Tool: vault_delete
// Arguments:
{
  "path": "secret/data/myapp/config"
}
```

## Development

### Build

```bash
npm run build
```

### Watch Mode

```bash
npm run watch
```

## Vault Setup

For testing, you can run Vault in dev mode:

```bash
vault server -dev
```

This will start Vault at `http://127.0.0.1:8200` with a root token displayed in the output.

## Security Notes

- Never commit your `VAULT_TOKEN` to version control
- Use appropriate Vault policies to restrict access
- Consider using AppRole or other authentication methods for production
- Ensure your Vault server uses TLS in production environments

## License

MIT
