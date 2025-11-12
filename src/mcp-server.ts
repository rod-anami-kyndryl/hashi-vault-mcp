#!/usr/bin/env node

import fs from "fs";
import https from "https";
import http from "http";
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import Vault from "hashi-vault-js";
import express, { Request, Response } from "express";
import cors from "cors";
import { z } from 'zod';

// Server configuration
const VAULT_ADDR = process.env.VAULT_ADDR || "http://127.0.0.1:8200";
const VAULT_TOKEN = process.env.VAULT_TOKEN || "";
const VAULT_TIMEOUT = process.env.VAULT_TIMEOUT ? parseInt(process.env.VAULT_TIMEOUT) : 5000;
const VAULT_URL = process.env.VAULT_URL || `${VAULT_ADDR}/v1`;
const VAULT_CACERT = process.env.VAULT_CACERT || undefined;
const MCP_AUTH_TOKEN = process.env.MCP_AUTH_TOKEN; // Optional: Bearer token for MCP server authentication
const MCP_TLS_KEY = process.env.MCP_TLS_KEY || './certs/mcp-server.key';
const MCP_TLS_CERT = process.env.MCP_TLS_CERT || './certs/mcp-server.crt';
const MCP_TLS_ENABLED = process.env.MCP_TLS_ENABLED === "true";

const tlsOptions = {
  key: fs.readFileSync(MCP_TLS_KEY),
  cert: fs.readFileSync(MCP_TLS_CERT)
  // No 'ca' needed for self-signed certificates
};

// Initialize Vault client
const vaultClient = new Vault({
  https: VAULT_ADDR.startsWith("https"),
  baseUrl: VAULT_URL,
  timeout: VAULT_TIMEOUT,
  proxy: false,
  cacert: VAULT_CACERT
});

// Create an MCP server
const server = new McpServer({
    name: 'vault-mcp-server',
    version: '0.1.0'
});


// Define available tools
// Register tools using registerTool with zod schemas
server.registerTool(
    "vault_kv_read",
    {
        title: 'Read a KV secret',
        description: 'Read a KV secret from HashiCorp Vault at the specified path and mount point',
        inputSchema: {
            path: z.string().describe("The path of the secret to read in Vault (e.g., myapp/config)"),
            mount: z.string().optional().describe("The mount point in Vault (e.g. secret)"),
            version: z.number().optional().describe("The version of the secret to read (for KV v2)"),
        }
    },
    async ({ path, version, mount }) => {
        const result = await vaultClient.readKVSecret(VAULT_TOKEN, path, version, mount);
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    }
);

server.registerTool(
    "vault_kv_create",
    {
        title: "Create a KV secret",
        description: "Create a KV secret in HashiCorp Vault at the specified path",
        inputSchema: {
            path: z.string().describe("The path to the secret in Vault (e.g. myapp/config)"),
            data: z.record(z.any()).describe("The secret data to write as a JSON object"),
            mount: z.string().optional().describe("The mount point in Vault (e.g. secret)")
        }
    },
    async ({ path, data , mount }) => {
        const result = await vaultClient.createKVSecret(VAULT_TOKEN, path, data, mount);
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    }
);

server.registerTool(
    "vault_kv_list",
    {
        title: "List KV secrets",
        description: "List KV secrets in HashiCorp Vault at the specified path",
        inputSchema: {
            mount: z.string().optional().describe("The mount point in Vault (e.g. secret)"),
            folder: z.string().optional().describe("The path to the secret in Vault (e.g. myapp)")
        }
    },
    async ({ folder, mount }) => {
        const result = await vaultClient.listKVSecrets(VAULT_TOKEN, folder, mount);
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    }
);

server.registerTool(
    "vault_kv_delete",
    {
        title: "Delete a KV secret",
        description: "Delete the latest KV secret from HashiCorp Vault at the specified path",
        inputSchema: {
            path: z.string().describe("The path to the secret in Vault (e.g., \"secret/data/myapp/config\")")
        }
    },
    async ({ path }) => {
        const result = await vaultClient.deleteLatestVerKVSecret(VAULT_TOKEN, path);
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    }
);

// Add a dynamic greeting resource
server.registerResource(
    "greeting",
    new ResourceTemplate("greeting://{name}", { list: undefined }),
    {
        title: 'Greeting Resource', // Display name for UI
        description: 'Dynamic greeting generator'
    },
    async (uri, { name }) => ({
        contents: [
            {
                uri: uri.href,
                text: `Hello, ${name}!`
            }
        ]
    })
);

// Start the server
const app = express();
const MCP_PORT = process.env.MCP_PORT ? parseInt(process.env.MCP_PORT) : 3000;

// Enable CORS for all routes
app.use(cors({
        origin: '*', // Configure appropriately for production, for example:
        // origin: ['https://your-remote-domain.com', 'https://your-other-remote-domain.com'],
        exposedHeaders: ['Mcp-Session-Id'],
        allowedHeaders: ['Accept','Content-Type', 'mcp-session-id', 'Authorization']
}));
app.use(express.json());

// Authentication middleware
const authenticate = (req: Request, res: Response, next: any) => {
    // Skip authentication if MCP_AUTH_TOKEN is not set
    if (!MCP_AUTH_TOKEN) {
        console.log('[Auth] Authentication disabled (MCP_AUTH_TOKEN not set)');
        return next();
    }

    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        console.log('[Auth] Missing Authorization header');
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Missing Authorization header'
        });
    }

    // Check for Bearer token format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        console.log('[Auth] Invalid Authorization header format');
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid Authorization header format. Expected: Bearer <token>'
        });
    }

    const token = parts[1];
    
    // Validate token
    if (token !== MCP_AUTH_TOKEN) {
        console.log('[Auth] Invalid token');
        return res.status(403).json({
            error: 'Forbidden',
            message: 'Invalid authentication token'
        });
    }

    console.log('[Auth] Authentication successful');
    next();
};

// Health check endpoint (unprotected)
app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", service: "hashi-vault-mcp" });
});

// MCP endpoint for server-to-client communication (protected)
// Handle both GET (for SSE) and POST (for regular requests)
// Gemini CLI also uses GET for initial handshake
app.all('/mcp', authenticate, async (req: Request, res: Response) => {
    try {
        console.log(`[MCP Server] ${req.method} request from ${req.ip}`);
        
        // Create a new transport for each request
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
            enableJsonResponse: true
        });

        res.on('close', () => {
            console.log('[MCP Server] Client disconnected');
            transport.close();
        });

        await server.connect(transport);
        
        // Handle the request with the body (or undefined for GET)
        await transport.handleRequest(req, res, req.body);
    } catch (error) {
        console.error('[MCP Server] Error handling request:', error);
        if (!res.headersSent) {
            res.status(500).json({
                jsonrpc: '2.0',
                error: {
                    code: -32603,
                    message: error instanceof Error ? error.message : 'Internal server error'
                },
                id: null
            });
        }
    }
});

let webServer: http.Server | https.Server;

if (MCP_TLS_ENABLED && MCP_TLS_CERT && MCP_TLS_KEY) {
    // HTTPS mode
    webServer = https.createServer(tlsOptions, app);
    
    webServer.listen(MCP_PORT, () => {
        console.log(`[HTTPS] MCP server listening on https://localhost:${MCP_PORT}`);
        console.log(`[HTTPS] Using certificate: ${MCP_TLS_CERT}`);
    }).on('error', error => {
    console.error('Server error:', error);
    process.exit(1);
  })
} else {
    // HTTP mode (default)
    webServer = http.createServer(app);
    
    webServer.listen(MCP_PORT, () => {
        console.log(`[HTTP] MCP server listening on http://localhost:${MCP_PORT}`);
        if (MCP_TLS_ENABLED) {
        console.warn('[WARNING] TLS enabled but certificate paths not provided');
        }
    }).on('error', error => {
        console.error('Server error:', error);
        process.exit(1);
    });
}