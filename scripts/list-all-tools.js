#!/usr/bin/env node

const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');

async function listAllTools() {
  try {
    console.log('Connecting to Mittwald MCP Server...');
    const transport = new StreamableHTTPClientTransport('http://localhost:3000/mcp');
    
    const client = new Client(
      {
        name: 'mcp-tester-tool-lister',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    await client.connect(transport);
    
    // List all tools
    const tools = await client.listTools();
    console.log(`\n📋 Complete Tool List (${tools.tools.length} tools):\n`);
    
    // Sort tools alphabetically
    const sortedTools = tools.tools.sort((a, b) => a.name.localeCompare(b.name));
    
    sortedTools.forEach((tool, index) => {
      console.log(`${(index + 1).toString().padStart(2, ' ')}. ${tool.name}`);
      console.log(`    ${tool.description}`);
      console.log('');
    });
    
    process.exit(0);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

listAllTools();