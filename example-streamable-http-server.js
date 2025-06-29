#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHttpServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';

/**
 * Example MCP server using StreamableHTTP transport
 */

const app = express();
app.use(express.json());

const server = new Server(
  {
    name: 'example-streamable-http-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Define tools
server.tools = [
  {
    name: 'calculate',
    description: 'Perform basic calculations',
    inputSchema: {
      type: 'object',
      properties: {
        operation: { 
          type: 'string', 
          enum: ['add', 'subtract', 'multiply', 'divide'],
          description: 'Mathematical operation'
        },
        a: { type: 'number', description: 'First number' },
        b: { type: 'number', description: 'Second number' },
      },
      required: ['operation', 'a', 'b'],
    },
  },
  {
    name: 'stream_data',
    description: 'Stream data chunks over HTTP',
    inputSchema: {
      type: 'object',
      properties: {
        chunks: { 
          type: 'number', 
          description: 'Number of data chunks to stream',
          minimum: 1,
          maximum: 10,
          default: 3
        },
        delay: { 
          type: 'number', 
          description: 'Delay between chunks in milliseconds',
          default: 100
        },
      },
    },
  },
];

// Define resources
server.resources = [
  {
    uri: 'config://server',
    name: 'Server Configuration',
    description: 'Current server configuration and status',
  },
];

// Handle tool calls
server.setRequestHandler('CallToolRequestSchema', async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'calculate':
      let result;
      switch (args.operation) {
        case 'add':
          result = args.a + args.b;
          break;
        case 'subtract':
          result = args.a - args.b;
          break;
        case 'multiply':
          result = args.a * args.b;
          break;
        case 'divide':
          if (args.b === 0) {
            throw new Error('Division by zero');
          }
          result = args.a / args.b;
          break;
        default:
          throw new Error(`Unknown operation: ${args.operation}`);
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `${args.a} ${args.operation} ${args.b} = ${result}`,
          },
        ],
      };

    case 'stream_data':
      const chunks = args.chunks || 3;
      const delay = args.delay || 100;
      const messages = [];
      
      for (let i = 1; i <= chunks; i++) {
        messages.push(`Chunk ${i}/${chunks}: Data packet ${Math.random().toString(36).substring(7)}`);
        if (i < chunks && delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      return {
        content: [
          {
            type: 'text',
            text: messages.join('\\n'),
          },
        ],
      };

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Handle resource reads
server.setRequestHandler('ReadResourceRequestSchema', async (request) => {
  const { uri } = request.params;

  switch (uri) {
    case 'config://server':
      return {
        contents: [
          {
            uri: 'config://server',
            mimeType: 'application/json',
            text: JSON.stringify({
              name: 'example-streamable-http-mcp-server',
              version: '1.0.0',
              transport: 'streamableHttp',
              uptime: process.uptime(),
              memory: process.memoryUsage(),
              platform: process.platform,
              nodeVersion: process.version,
            }, null, 2),
          },
        ],
      };

    default:
      throw new Error(`Unknown resource: ${uri}`);
  }
});

// Set up StreamableHTTP endpoint
app.post('/mcp/streamable', async (req, res) => {
  console.log('StreamableHTTP client connected');
  
  const transport = new StreamableHttpServerTransport({
    path: '/mcp/streamable',
    request: req,
    response: res,
  });
  
  await server.connect(transport);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    server: 'example-streamable-http-mcp-server',
    transport: 'streamableHttp'
  });
});

// Metadata endpoint for OAuth flows (if needed)
app.get('/.well-known/mcp', (req, res) => {
  res.json({
    name: 'example-streamable-http-mcp-server',
    version: '1.0.0',
    serverCapabilities: {
      tools: true,
      resources: true,
      prompts: false,
    },
    endpoints: {
      mcp: '/mcp/streamable',
      health: '/health',
    },
  });
});

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log(`Example StreamableHTTP MCP Server running on http://localhost:${PORT}`);
  console.log(`StreamableHTTP endpoint: http://localhost:${PORT}/mcp/streamable`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});