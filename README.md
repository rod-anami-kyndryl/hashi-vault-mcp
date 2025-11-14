# HashiCorp Vault MCP Server

A Model Context Protocol (MCP) server that provides tools for interacting with HashiCorp Vault via Streamable HTTP API.

## Features

This MCP server provides the following tools for Vault KV operations:

- **vault_kv_read**: Read secrets from Vault at a specified path with optional version and mount point
- **vault_kv_create**: Create/write secrets to Vault at a specified path
- **vault_kv_list**: List secrets at a specified path in a mount point
- **vault_kv_delete**: Delete the latest version of secrets from Vault at a specified path

### Security Features

- **Optional Bearer Token Authentication**: Protect your MCP endpoints with token-based authentication
- **TLS/HTTPS Support**: Enable encrypted connections with custom certificates
- **CORS Configuration**: Control cross-origin access to your server

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

The server supports the following environment variables:

### Vault Configuration (Required)

- `VAULT_ADDR`: The address of your Vault server (default: `http://127.0.0.1:8200`)
- `VAULT_TOKEN`: Your Vault authentication token
- `VAULT_URL`: Full Vault API URL (default: `${VAULT_ADDR}/v1`)
- `VAULT_TIMEOUT`: Request timeout in milliseconds (default: `5000`)
- `VAULT_CACERT`: Path to CA certificate for Vault TLS verification (optional)

### MCP Server Configuration

- `MCP_PORT`: The port for the MCP server API (default: `3000`)

### Security Configuration (Optional)

- `MCP_AUTH_TOKEN`: Bearer token for API authentication (if not set, authentication is disabled)
- `MCP_TLS_ENABLED`: Set to `"true"` to enable HTTPS (default: `false`)
- `MCP_TLS_KEY`: Path to TLS private key (default: `./certs/mcp-server.key`)
- `MCP_TLS_CERT`: Path to TLS certificate (default: `./certs/mcp-server.crt`)
- `MCP_TLS_CA`: Path to CA certificate (default: `./certs/ca.crt`)

See `.env.example` for a complete configuration template.

## Usage

### Running the Server

**Basic (HTTP, no authentication):**

```bash
npm start
```

**With Authentication:**

```bash
export MCP_AUTH_TOKEN="your-secure-token-here"
npm start
```

**With HTTPS:**

```bash
export MCP_TLS_ENABLED="true"
export MCP_TLS_KEY="./certs/mcp-server.key"
export MCP_TLS_CERT="./certs/mcp-server.crt"
npm start
```

The server will expose the following endpoints:

- `/health` - Health check endpoint (unprotected)
- `/mcp` - MCP endpoint for client connections (protected if `MCP_AUTH_TOKEN` is set)

### Authentication

When `MCP_AUTH_TOKEN` is set, all requests to `/mcp` must include:

```bash
Authorization: Bearer <your-token>
```

For detailed authentication setup, see [AUTHENTICATION.md](./AUTHENTICATION.md).

### Using with Gemini CLI

Add this configuration to your Gemini config file:

**MacOS**: `~/.config/gemini-cli/config.json`

**Without Authentication:**

```json
{
  "mcpServers": {
    "vault": {
      "url": "http://localhost:3000/mcp",
      "transport": "http",
      "headers": {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream"
      }
    }
  }
}
```

**With Authentication:**

```json
{
  "mcpServers": {
    "vault": {
      "url": "http://localhost:3000/mcp",
      "transport": "http",
      "headers": {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        "Authorization": "Bearer your-secure-token-here"
      }
    }
  }
}
```

**With HTTPS:**

```json
{
  "mcpServers": {
    "vault": {
      "url": "https://localhost:3000/mcp",
      "transport": "http",
      "headers": {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        "Authorization": "Bearer your-secure-token-here"
      }
    }
  }
}
```

For more details, see [GEMINI_CLI_SETUP.md](./GEMINI_CLI_SETUP.md).

Note: Make sure the server is running before connecting with Gemini CLI.

### Using with Claude Desktop

Add this configuration to Claude Desktop:

**MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "vault": {
      "url": "http://localhost:3000/mcp",
      "headers": {
        "Authorization": "Bearer your-secure-token-here"
      }
    }
  }
}
```

For more details, see [COPILOT_SETUP.md](./COPILOT_SETUP.md).

### Using with Other MCP Clients

Connect to the endpoint at `http://localhost:3000/mcp` (or `https://` if TLS is enabled) using any MCP-compatible client. The server supports both GET and POST requests with StreamableHTTPServerTransport.

## Tool Examples

### Reading a Secret

```json
{
  "tool": "vault_kv_read",
  "arguments": {
    "path": "myapp/config",
    "mount": "secret",
    "version": 1
  }
}
```

### Creating/Writing a Secret

```json
{
  "tool": "vault_kv_create",
  "arguments": {
    "path": "myapp/config",
    "mount": "secret",
    "data": {
      "username": "admin",
      "password": "secret123",
      "api_key": "abc-xyz-123"
    }
  }
}
```

### Listing Secrets

```json
{
  "tool": "vault_kv_list",
  "arguments": {
    "mount": "secret",
    "folder": "myapp"
  }
}
```

### Deleting a Secret

```json
{
  "tool": "vault_kv_delete",
  "arguments": {
    "path": "secret/data/myapp/config"
  }
}
```

### Testing with cURL

```bash
# List available tools
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer your-token" \
  -d '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}'
```

For more examples, see [TESTING.md](./TESTING.md).

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

### Vault Security

- Never commit your `VAULT_TOKEN` to version control
- Use appropriate Vault policies to restrict access
- Consider using AppRole or other authentication methods for production
- Ensure your Vault server uses TLS in production environments
- Use `VAULT_CACERT` to verify Vault's TLS certificate

### MCP Server Security

- **Enable Authentication**: Set `MCP_AUTH_TOKEN` to protect your MCP endpoints
- **Use HTTPS**: Enable `MCP_TLS_ENABLED` for encrypted connections in production
- **Generate Strong Tokens**: Use `openssl rand -hex 32` for authentication tokens
- **Rotate Tokens**: Change authentication tokens regularly
- **Network Access**: Use firewalls or reverse proxies to restrict access
- **Environment Security**: Never commit `.env` files with real tokens
- **Certificate Management**: Keep TLS certificates and keys secure (`chmod 600`)

For detailed security guidance, see [AUTHENTICATION.md](./AUTHENTICATION.md).

## Quick Start

1. **Clone and install:**

   ```bash
   git clone <repository-url>
   cd hashi-vault-mcp
   npm install
   ```

2. **Configure environment:**

   ```bash
   cp .env.example .env
   # Edit .env with your Vault details
   ```

3. **Build and run:**

   ```bash
   npm run build
   npm start
   ```

4. **Test the server:**

   ```bash
   curl http://localhost:3000/health
   ```

## Additional Documentation

- [Authentication Setup](./AUTHENTICATION.md) - Detailed guide for bearer token authentication and TLS
- [Gemini CLI Setup](./GEMINI_CLI_SETUP.md) - Configure Gemini CLI to use this server
- [Claude Desktop Setup](./COPILOT_SETUP.md) - Configure Claude Desktop integration
- [Testing Guide](./TESTING.md) - Test scripts and troubleshooting

## Troubleshooting

### Connection Issues

- Verify Vault is running: `vault status`
- Check `VAULT_ADDR` matches your Vault server address
- Ensure `VAULT_TOKEN` has appropriate permissions
- For HTTPS Vault, set `VAULT_CACERT` to your CA certificate path

### Authentication Errors

- Verify `MCP_AUTH_TOKEN` matches between server and client
- Check Authorization header format: `Bearer <token>`
- Ensure token is set in client configuration

### TLS/HTTPS Issues

- Verify certificate files exist at configured paths
- Check certificate file permissions
- For self-signed certificates, clients may need to trust the CA or use `-k` flag

## License

MIT
