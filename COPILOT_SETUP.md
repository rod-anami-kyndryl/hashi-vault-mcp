# Configuring GitHub Copilot Chat with HashiCorp Vault MCP Server

This guide explains how to configure GitHub Copilot Chat to use the HashiCorp Vault MCP server.

## Prerequisites

1. **Build the MCP Server**

   ```bash
   npm install
   npm run build
   ```

2. **Set up Environment Variables**

   Create a `.env` file in the project root:
   ```bash
   VAULT_ADDR=http://127.0.0.1:8200
   VAULT_TOKEN=your-vault-token-here
   MCP_PORT=3000
   ```

3. **Start the MCP Server**

   ```bash
   npm run start
   ```

   Or manually:

   ```bash
   export VAULT_ADDR="http://127.0.0.1:8200"
   export VAULT_TOKEN="your-vault-token"
   export MCP_PORT=3000
   node dist/index.js
   ```

## Configuration for Different MCP Clients

### 1. Claude Desktop Configuration

**Location:**

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

**Configuration:**

```json
{
  "mcpServers": {
    "vault": {
      "url": "http://localhost:3000/sse"
    }
  }
}
```

**Steps:**

1. Ensure the MCP server is running
2. Add the configuration above to your Claude Desktop config
3. Restart Claude Desktop
4. The Vault tools will be available in the chat

### 2. VS Code GitHub Copilot Chat Configuration

**Note**: As of now, GitHub Copilot Chat doesn't natively support external MCP servers via HTTP/SSE. However, you can:

**Option A: Use via VS Code Settings (if supported in future updates)**

```json
{
  "github.copilot.advanced": {
    "mcpServers": {
      "vault": {
        "url": "http://localhost:3000/sse"
      }
    }
  }
}
```

**Option B: Use with MCP Inspector for Testing**

Install the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector dist/index.js
```

### 3. Custom MCP Client Configuration

For any MCP-compatible client that supports HTTP/SSE transport:

```json
{
  "servers": {
    "vault": {
      "type": "sse",
      "url": "http://localhost:3000/sse",
      "messageEndpoint": "http://localhost:3000/message"
    }
  }
}
```

## Using the Vault Tools

Once configured, you can use these tools in your chat:

### Example Queries

1. **Read a secret**:

   ```text
   Can you read the secret at path "secret/data/myapp/database"?
   ```

2. **Write a secret**:

   ```text
   Write a secret to "secret/data/myapp/api" with data: {"api_key": "abc123", "api_secret": "xyz789"}
   ```

3. **List secrets**:

   ```text
   List all secrets under "secret/metadata/myapp"
   ```

4. **Delete the latest secret version**:

   ```text
   Delete the secret at "secret/data/myapp/old-config"
   ```

## Troubleshooting

### Server Not Connecting

1. Check if the server is running: `curl http://localhost:3000/health`
2. Verify the port is correct (default: 3000)
3. Check firewall settings

### Authentication Errors

1. Verify `VAULT_TOKEN` is set correctly
2. Test Vault access: `vault login $VAULT_TOKEN`
3. Check token permissions in Vault

### Tools Not Appearing

1. Restart the MCP client
2. Check server logs for errors
3. Verify the SSE endpoint is accessible: `curl http://localhost:3000/sse`

## Security Best Practices

1. **Never commit credentials**: Add `.env` to `.gitignore`
2. **Use local connections**: Only expose to localhost unless necessary
3. **Rotate tokens**: Regularly update Vault tokens
4. **Use policies**: Restrict Vault token permissions to minimum required
5. **Enable TLS**: Use HTTPS for production Vault servers

## Advanced Configuration

### Using with HTTPS Vault

```bash
export VAULT_ADDR="https://vault.example.com:8200"
export VAULT_TOKEN="your-vault-token"
export PORT=3000
```

### Custom Port

```bash
export PORT=8080
node dist/index.js
```

Then update your client config:

```json
{
  "mcpServers": {
    "vault": {
      "url": "http://localhost:8080/sse"
    }
  }
}
```

### Running as a Background Service

Using PM2:
```bash
npm install -g pm2
pm2 start dist/index.js --name vault-mcp -- --env-file .env
pm2 save
```

Using systemd (Linux):
Create `/etc/systemd/system/vault-mcp.service`:

```ini
[Unit]
Description=HashiCorp Vault MCP Server
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/hashi-vault-mcp
EnvironmentFile=/path/to/hashi-vault-mcp/.env
ExecStart=/usr/bin/node /path/to/hashi-vault-mcp/dist/index.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable vault-mcp
sudo systemctl start vault-mcp
```

## Support

For issues or questions:

1. Check server logs
2. Verify Vault connectivity
3. Test with MCP Inspector
4. Review Vault audit logs
