# Configuring Gemini CLI for HashiCorp Vault MCP Server

This guide explains how to configure Google's Gemini CLI to use the HashiCorp Vault MCP server via HTTP endpoint.

## Prerequisites

1. **Install Gemini CLI** (if not already installed)
   ```bash
   npm install -g @google/generative-ai-cli
   ```

2. **Ensure your MCP server is running**
   ```bash
   npm run start
   # Server should be running on http://localhost:3000
   ```

3. **Verify the endpoint is accessible**
   ```bash
   curl http://localhost:3000/health
   # Should return: {"status":"ok","service":"hashi-vault-mcp"}
   ```

## Configuration

### Important: Required Headers

The MCP server requires clients to send the following headers:

```
Content-Type: application/json
Accept: application/json, text/event-stream
```

**If you get a 406 Not Acceptable error**, make sure your client is sending the `Accept` header with both content types.

### Option 1: Using Gemini CLI Configuration File

Create or edit the Gemini CLI configuration file:

**Location**: `~/.config/gemini-cli/config.json` or `~/.gemini-cli.json`

```json
{
  "mcpServers": {
    "vault": {
      "url": "http://localhost:3000/mcp",
      "transport": "http"
    }
  }
}
```

### Option 2: Using Environment Variable

Set the MCP server configuration via environment variable:

```bash
export GEMINI_MCP_SERVERS='{"vault":{"url":"http://localhost:3000/mcp","transport":"http"}}'
gemini-cli chat
```

### Option 3: Command Line Flag

Pass the MCP server configuration directly when starting Gemini CLI:

```bash
gemini-cli chat --mcp-server vault=http://localhost:3000/mcp
```

## Full Configuration Example

Here's a complete configuration with multiple settings:

**File**: `~/.config/gemini-cli/config.json`

```json
{
  "apiKey": "your-gemini-api-key",
  "model": "gemini-pro",
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

## Starting Gemini CLI with Vault MCP Server

### Basic Usage

```bash
# Start interactive chat
gemini-cli chat

# Once in the chat, you can use Vault tools:
> Can you read the secret at path "secret/data/myapp/config"?
> List all secrets under "secret/metadata/myapp"
> Write a secret to "secret/data/myapp/test" with key "value"
```

### With Specific Model

```bash
gemini-cli chat --model gemini-pro-1.5
```

### With API Key Inline

```bash
GEMINI_API_KEY=your-api-key gemini-cli chat
```

## Available Vault Tools

Once connected, the following tools are available to Gemini:

1. **vault_read** - Read secrets from Vault
   ```
   Read the secret at path "secret/data/myapp/database"
   ```

2. **vault_write** - Write secrets to Vault
   ```
   Write a secret to "secret/data/myapp/api" with api_key="abc123" and api_secret="xyz789"
   ```

3. **vault_list** - List secrets at a path
   ```
   List all secrets under "secret/metadata/myapp"
   ```

4. **vault_delete** - Delete secrets from Vault
   ```
   Delete the secret at "secret/data/myapp/old-config"
   ```

## Troubleshooting

### Connection Issues

**Problem**: "Failed to connect to MCP server"

**Solutions**:
1. Verify server is running:
   ```bash
   curl http://localhost:3000/health
   ```

2. Check the port matches:
   ```bash
   echo $MCP_PORT
   # Should be 3000 or match your configuration
   ```

3. Review server logs for errors

### Authentication Issues

**Problem**: Vault authentication errors

**Solutions**:
1. Check VAULT_TOKEN is set:
   ```bash
   echo $VAULT_TOKEN
   ```

2. Verify token has necessary permissions:
   ```bash
   vault token lookup
   ```

3. Test Vault connectivity:
   ```bash
   vault status
   ```

### CORS Issues

**Problem**: CORS errors in browser-based tools

**Solution**: The server already has CORS enabled for all origins. If you need to restrict:

Edit `src/index.ts` and modify the CORS configuration:
```typescript
app.use(cors({
    origin: ['http://localhost:3000', 'http://your-domain.com'],
    exposedHeaders: ['Mcp-Session-Id'],
    allowedHeaders: ['Content-Type', 'mcp-session-id']
}));
```

## Advanced Configuration

### Using with Multiple MCP Servers

```json
{
  "mcpServers": {
    "vault": {
      "url": "http://localhost:3000/mcp",
      "transport": "http"
    },
    "database": {
      "url": "http://localhost:3001/mcp",
      "transport": "http"
    }
  }
}
```

### Custom Headers and Authentication

If you need to add custom headers (for future authentication):

```json
{
  "mcpServers": {
    "vault": {
      "url": "http://localhost:3000/mcp",
      "transport": "http",
      "headers": {
        "Content-Type": "application/json",
        "Authorization": "Bearer your-token",
        "X-Custom-Header": "value"
      }
    }
  }
}
```

### Using Different Ports

If your MCP server runs on a different port:

```bash
# Start server on custom port
MCP_PORT=8080 npm run start

# Configure Gemini CLI
gemini-cli chat --mcp-server vault=http://localhost:8080/mcp
```

## Testing the Connection

### Quick Test Script

Create a test file `test-mcp.sh`:

```bash
#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "Testing MCP Server Connection..."

# Test health endpoint
echo -n "Health check: "
if curl -s http://localhost:3000/health | grep -q "ok"; then
    echo -e "${GREEN}✓ Passed${NC}"
else
    echo -e "${RED}✗ Failed${NC}"
    exit 1
fi

# Test MCP endpoint (should respond to POST)
echo -n "MCP endpoint: "
RESPONSE=$(curl -s -X POST http://localhost:3000/mcp \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}')

if [ ! -z "$RESPONSE" ]; then
    echo -e "${GREEN}✓ Passed${NC}"
else
    echo -e "${RED}✗ Failed${NC}"
    exit 1
fi

echo -e "\n${GREEN}All tests passed!${NC}"
echo "You can now configure Gemini CLI to use: http://localhost:3000/mcp"
```

Run it:
```bash
chmod +x test-mcp.sh
./test-mcp.sh
```

## Integration Examples

### Example Session

```bash
$ gemini-cli chat

Gemini CLI v1.0.0
Connected to MCP servers: vault

> Hi! Can you help me manage my Vault secrets?

Sure! I have access to your HashiCorp Vault through the MCP server. 
I can help you read, write, list, and delete secrets. What would you like to do?

> List all secrets under secret/metadata/myapp

[Gemini uses vault_list tool...]
I found the following secrets:
- secret/metadata/myapp/database
- secret/metadata/myapp/api-keys
- secret/metadata/myapp/config

> Read the database secret

[Gemini uses vault_read tool...]
Here's the database secret at secret/data/myapp/database:
{
  "host": "localhost",
  "port": 5432,
  "username": "admin"
}
```

## Security Considerations

1. **Network Security**: The server listens on all interfaces by default. For production:
   - Use a reverse proxy with HTTPS
   - Restrict access via firewall rules
   - Use authentication middleware

2. **Token Security**: 
   - Never commit `.env` files
   - Use short-lived tokens
   - Rotate tokens regularly
   - Use minimum required Vault policies

3. **CORS Configuration**: 
   - Restrict origins in production
   - Don't use `origin: '*'` in production environments

## Alternative Clients

This HTTP endpoint also works with:

- **Claude Desktop** - See `COPILOT_SETUP.md`
- **MCP Inspector** - `npx @modelcontextprotocol/inspector`
- **Custom MCP Clients** - Any client supporting HTTP transport
- **Postman/cURL** - For manual testing

## Support

For issues:
1. Check server logs: `npm run start` output
2. Verify Vault connectivity: `vault status`
3. Test endpoint: `curl http://localhost:3000/health`
4. Review Gemini CLI docs: `gemini-cli --help`
