#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server(
  {
    name: 'simple-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
server.tools = [
  {
    name: 'add',
    description: 'Add two numbers',
    inputSchema: {
      type: 'object',
      properties: {
        a: { type: 'number', description: 'First number' },
        b: { type: 'number', description: 'Second number' },
      },
      required: ['a', 'b'],
    },
  },
  {
    name: 'multiply',
    description: 'Multiply two numbers',
    inputSchema: {
      type: 'object',
      properties: {
        a: { type: 'number', description: 'First number' },
        b: { type: 'number', description: 'Second number' },
      },
      required: ['a', 'b'],
    },
  },
];

// Handle tool calls
server.setRequestHandler('CallToolRequestSchema', async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'add':
      return {
        content: [
          {
            type: 'text',
            text: `${args.a} + ${args.b} = ${args.a + args.b}`,
          },
        ],
      };

    case 'multiply':
      return {
        content: [
          {
            type: 'text',
            text: `${args.a} × ${args.b} = ${args.a * args.b}`,
          },
        ],
      };

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Simple MCP Server running on stdio');
}

main().catch(console.error);