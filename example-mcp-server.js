#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');

/**
 * Example MCP server for testing purposes
 */
class ExampleMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'example-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  setupHandlers() {
    // Handle list tools request
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'add_numbers',
            description: 'Adds two numbers together',
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
            name: 'get_random_number',
            description: 'Returns a random number between min and max',
            inputSchema: {
              type: 'object',
              properties: {
                min: { type: 'number', description: 'Minimum value', default: 0 },
                max: { type: 'number', description: 'Maximum value', default: 100 },
              },
            },
          },
          {
            name: 'echo',
            description: 'Echoes back the provided message',
            inputSchema: {
              type: 'object',
              properties: {
                message: { type: 'string', description: 'Message to echo' },
              },
              required: ['message'],
            },
          },
        ],
      };
    });


    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'add_numbers':
          if (typeof args.a !== 'number' || typeof args.b !== 'number') {
            throw new Error('Both a and b must be numbers');
          }
          return {
            content: [
              {
                type: 'text',
                text: `${args.a} + ${args.b} = ${args.a + args.b}`,
              },
            ],
          };

        case 'get_random_number':
          const min = args.min ?? 0;
          const max = args.max ?? 100;
          const random = Math.floor(Math.random() * (max - min + 1)) + min;
          return {
            content: [
              {
                type: 'text',
                text: `Random number between ${min} and ${max}: ${random}`,
              },
            ],
          };

        case 'echo':
          if (!args.message) {
            throw new Error('Message is required');
          }
          return {
            content: [
              {
                type: 'text',
                text: `Echo: ${args.message}`,
              },
            ],
          };

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Example MCP Server running on stdio');
  }
}

// Start the server
const server = new ExampleMCPServer();
server.run().catch(console.error);