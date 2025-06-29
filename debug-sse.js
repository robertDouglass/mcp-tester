#!/usr/bin/env node

const { SSEClientTransport } = require('@modelcontextprotocol/sdk/client/sse.js');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');

async function testSSE() {
  try {
    console.log('Creating SSE transport...');
    const transport = new SSEClientTransport('http://localhost:3000/mcp');
    
    console.log('Creating client...');
    const client = new Client(
      {
        name: 'test-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    console.log('Connecting...');
    await client.connect(transport);
    
    console.log('✓ Connected successfully!');
    
    console.log('Listing tools...');
    const tools = await client.listTools();
    console.log(`Found ${tools.tools.length} tools`);
    
    // Show first few tools
    console.log('First 3 tools:');
    tools.tools.slice(0, 3).forEach(tool => {
      console.log(`- ${tool.name}: ${tool.description}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testSSE();