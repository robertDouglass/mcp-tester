#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';

/**
 * Example MCP server using SSE (Server-Sent Events) transport
 */

const app = express();
const server = new Server(
  {
    name: 'example-sse-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tools
server.tools = [
  {
    name: 'get_time',
    description: 'Get current server time',
    inputSchema: {
      type: 'object',
      properties: {
        timezone: { 
          type: 'string', 
          description: 'Timezone (e.g., UTC, America/New_York)',
          default: 'UTC'
        },
      },
    },
  },
  {
    name: 'echo_sse',
    description: 'Echo a message via SSE transport',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Message to echo' },
        delay: { 
          type: 'number', 
          description: 'Delay in milliseconds before echoing',
          default: 0
        },
      },
      required: ['message'],
    },
  },
];

// Handle tool calls
server.setRequestHandler('CallToolRequestSchema', async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'get_time':
      const timezone = args.timezone || 'UTC';
      const time = new Date().toLocaleString('en-US', { timeZone: timezone });
      return {
        content: [
          {
            type: 'text',
            text: `Current time in ${timezone}: ${time}`,
          },
        ],
      };

    case 'echo_sse':
      if (args.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, args.delay));
      }
      return {
        content: [
          {
            type: 'text',
            text: `[SSE Echo] ${args.message}`,
          },
        ],
      };

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Set up SSE endpoint
app.use('/sse', async (req, res) => {
  console.log('SSE client connected');
  
  const transport = new SSEServerTransport({
    path: '/sse',
    response: res,
  });
  
  await server.connect(transport);
  
  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write(':keepalive\\n\\n');
  }, 30000);
  
  req.on('close', () => {
    console.log('SSE client disconnected');
    clearInterval(keepAlive);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    server: 'example-sse-mcp-server',
    transport: 'sse'
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Example SSE MCP Server running on http://localhost:${PORT}`);
  console.log(`SSE endpoint: http://localhost:${PORT}/sse`);
});