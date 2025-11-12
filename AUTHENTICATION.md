# MCP Server Authentication

This guide explains how to configure and use bearer token authentication for the HashiCorp Vault MCP Server.

## Overview

The MCP server supports optional bearer token authentication to protect the `/mcp` endpoint. When enabled, all requests must include a valid `Authorization: Bearer <token>` header.

## Configuration

### 1. Enable Authentication

Set the `MCP_AUTH_TOKEN` environment variable:

```bash
# In your .env file
MCP_AUTH_TOKEN=your-secret-token-here
```

Or export it:

```bash
export MCP_AUTH_TOKEN="my-secure-random-token-12345"
```

### 2. Generate a Secure Token

**Important**: Use a cryptographically secure random token, not a simple password.

```bash
# On macOS/Linux - generate a random 32-byte token
openssl rand -hex 32

# Or use uuidgen
uuidgen

# Example output: 123ABC456DEF789GHI012JLK345MNO674d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9
```

### 3. Disable Authentication (Default)

If `MCP_AUTH_TOKEN` is not set or empty, authentication is **disabled** and all requests are allowed.

```bash
# Authentication disabled
# MCP_AUTH_TOKEN=
```

## Usage

### Testing with cURL

**With authentication:**

```bash
# Set your token - this is a dummy token!
export MCP_AUTH_TOKEN="my-secret-32-hexadecimal-token"

# Make authenticated request
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer $MCP_AUTH_TOKEN" \
  -d '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}'
```

**Without authentication (will fail if enabled):**

```bash
# This will return 401 Unauthorized
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}'
```

### Gemini CLI Configuration

**File**: `~/.gemini/settings.json`

```json
{
  "mcpServers": {
    "vault": {
      "url": "http://localhost:3000/mcp",
      "headers": {
        "Authorization": "Bearer 123ABC456DEF789GHI012JLK345MNO67"
      }
    }
  }
}
```

### Custom MCP Client (JavaScript/TypeScript)

```typescript
const response = await fetch('http://localhost:3000/mcp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
    'Authorization': 'Bearer my-secret-32-hexadecimal-token'
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'tools/list',
    params: {},
    id: 1
  })
});
```

## Error Responses

### 401 Unauthorized - Missing Authorization Header

```json
{
  "error": "Unauthorized",
  "message": "Missing Authorization header"
}
```

**Solution**: Add the `Authorization: Bearer <token>` header to your request.

### 401 Unauthorized - Invalid Format

```json
{
  "error": "Unauthorized",
  "message": "Invalid Authorization header format. Expected: Bearer <token>"
}
```

**Solution**: Ensure the header is formatted as `Authorization: Bearer <your-token>`.

### 403 Forbidden - Invalid Token

```json
{
  "error": "Forbidden",
  "message": "Invalid authentication token"
}
```

**Solution**: Verify your token matches the `MCP_AUTH_TOKEN` environment variable.

## Security Best Practices

### 1. Use Strong Tokens

✅ **DO**: Use cryptographically secure random tokens (32+ bytes)

```bash
openssl rand -hex 32
```

❌ **DON'T**: Use simple passwords or predictable values

```bash
# Bad examples:
MCP_AUTH_TOKEN=password123
MCP_AUTH_TOKEN=admin
```

### 2. Rotate Tokens Regularly

Change your authentication token periodically:

```bash
# Generate new token
NEW_TOKEN=$(openssl rand -hex 32)

# Update .env file
echo "MCP_AUTH_TOKEN=$NEW_TOKEN" >> .env

# Restart server
npm run start

# Update client configurations with new token
```

## End of Doc
