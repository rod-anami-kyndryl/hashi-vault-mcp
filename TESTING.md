# Testing the HashiCorp Vault MCP Server

## Quick Tests

### 1. Test Health Endpoint

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{"status":"ok","service":"hashi-vault-mcp"}
```

### 2. Test MCP Endpoint (Basic)

**Important**: The MCP endpoint requires both `application/json` and `text/event-stream` in the Accept header.

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    },
    "id": 1
  }'
```

### 3. List Available Tools

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "params": {},
    "id": 2
  }'
```

Expected response should include:

- `vault_kv_read`
- `vault_kv_create`
- `vault_kv_list`
- `vault_kv_delete`

## Common Errors and Solutions

### Error: HTTP/1.1 404 Not Found

**Cause**: Wrong HTTP method (using GET instead of POST)

**Solution**: Use POST:

```bash
curl -X POST http://localhost:3000/mcp ...
```

### Error: HTTP/1.1 406 Not Acceptable

**Cause**: Missing or incorrect Accept header

**Full error message**:

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32000,
    "message": "Not Acceptable: Client must accept both application/json and text/event-stream"
  },
  "id": null
}
```

**Solution**: Add the correct Accept header:

```bash
-H "Accept: application/json, text/event-stream"
```

### Error: Connection Refused

**Cause**: Server is not running

**Solution**: Start the server:

```bash
npm run start
```

## Testing with MCP Inspector

The official MCP Inspector tool is great for testing:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

However, for HTTP transport, you need to configure it differently:

```bash
# Start your server first
npm run start

# In another terminal, use the inspector with the HTTP endpoint
# Note: The inspector may need updates to support HTTP transport
```

## Testing with cURL - Full Example

Here's a complete test script:

```bash
#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "Testing HashiCorp Vault MCP Server"
echo "===================================="

# Test 1: Health Check
echo -e "\n${YELLOW}Test 1: Health Check${NC}"
RESPONSE=$(curl -s http://localhost:3000/health)
if echo "$RESPONSE" | grep -q "ok"; then
    echo -e "${GREEN}✓ PASSED${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "Response: $RESPONSE"
    exit 1
fi
```

## MCP Initialize (without Accept header - should fail)

```bash
echo -e "\n${YELLOW}Test 2: MCP without Accept header (should fail with 406)${NC}"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}')

if [ "$STATUS" = "406" ]; then
    echo -e "${GREEN}✓ PASSED (correctly rejected)${NC}"
else
    echo -e "${RED}✗ FAILED (expected 406, got $STATUS)${NC}"
fi
```

## MCP Initialize (with correct headers)

```bash
echo -e "\n${YELLOW}Test 3: MCP with correct headers${NC}"
RESPONSE=$(curl -s -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "test", "version": "1.0.0"}
    },
    "id": 1
  }')

if echo "$RESPONSE" | grep -q "result"; then
    echo -e "${GREEN}✓ PASSED${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "Response: $RESPONSE"
fi

# Test 4: List Tools
echo -e "\n${YELLOW}Test 4: List Tools${NC}"
RESPONSE=$(curl -s -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":2}')

if echo "$RESPONSE" | grep -q "vault_kv_read"; then
    echo -e "${GREEN}✓ PASSED${NC}"
    echo "Available tools:"
    echo "$RESPONSE" | jq -r '.result.tools[].name' 2>/dev/null || echo "$RESPONSE"
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "Response: $RESPONSE"
fi

echo -e "\n${GREEN}All tests completed!${NC}"
```

Save as `test-server.sh` and run:

```bash
chmod +x test-server.sh
./test-server.sh
```

## Manual Testing Workflow

1. **Start the server**:

   ```bash
   npm run start
   ```

2. **In another terminal, test health**:

   ```bash
   curl http://localhost:3000/health
   ```

3. **Test MCP connection**:

   ```bash
   curl -X POST http://localhost:3000/mcp \
     -H "Content-Type: application/json" \
     -H "Accept: application/json, text/event-stream" \
     -d '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}' | jq
   ```

4. **Test with a client** (Claude Desktop, Gemini CLI, etc.)

## Debugging Tips

### Enable Verbose Logging

Add console logs to see what's happening:

```typescript
// In src/index.ts, add to the /mcp handler:
app.post('/mcp', async (req, res) => {
    console.log('Received request:', {
        method: req.method,
        headers: req.headers,
        body: req.body
    });
    // ... rest of handler
});
```

### Check Server Logs

The server outputs useful information:

```bash
HashiCorp Vault MCP Server running on http://localhost:3000
MCP endpoint available at http://localhost:3000/mcp
```

Any errors will be logged to stderr.

### Test Vault Connectivity

Before testing the MCP server, ensure Vault is accessible:

```bash
# Set your token
export VAULT_TOKEN="your-token"

# Test connection
vault status

# List secrets
vault kv list secret/
```
