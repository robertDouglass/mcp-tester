#!/usr/bin/env node

const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');

async function testStreamableHTTP() {
  try {
    console.log('Creating StreamableHTTP transport...');
    const transport = new StreamableHTTPClientTransport('http://localhost:3000/mcp');
    
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

testStreamableHTTP();