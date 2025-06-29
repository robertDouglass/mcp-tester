#!/usr/bin/env node

console.log('🔍 Demonstrating transport type issue...\n');

console.log('1. Testing with SSE transport (WRONG):');
console.log('   Command: npx @robertdouglass/mcp-tester sse http://localhost:3000/mcp');

const { SSEClientTransport } = require('@modelcontextprotocol/sdk/client/sse.js');
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');

async function testSSE() {
  try {
    console.log('   Attempting SSE connection...');
    const transport = new SSEClientTransport('http://localhost:3000/mcp');
    const client = new Client({name: 'test', version: '1.0.0'}, {});
    
    // Set a timeout
    const timeout = setTimeout(() => {
      console.log('   ❌ SSE connection timeout after 3 seconds');
      console.log('   Error: EventSource fails because server expects StreamableHTTP\n');
      testStreamableHTTP();
    }, 3000);
    
    await client.connect(transport);
    clearTimeout(timeout);
    console.log('   ✅ Connected (unexpected)');
  } catch (error) {
    console.log('   ❌ SSE Error:', error.message);
    console.log('   This is why the npx command hangs!\n');
    testStreamableHTTP();
  }
}

async function testStreamableHTTP() {
  console.log('2. Testing with StreamableHTTP transport (CORRECT):');
  console.log('   Command: npx @robertdouglass/mcp-tester streamableHttp http://localhost:3000/mcp');
  
  try {
    console.log('   Attempting StreamableHTTP connection...');
    const transport = new StreamableHTTPClientTransport('http://localhost:3000/mcp');
    const client = new Client({name: 'test', version: '1.0.0'}, {});
    
    await client.connect(transport);
    console.log('   ✅ Connected successfully!');
    
    const tools = await client.listTools();
    console.log(`   ✅ Found ${tools.tools.length} tools\n`);
    
    console.log('📝 Summary:');
    console.log('- The server at http://localhost:3000/mcp uses StreamableHTTP transport');
    console.log('- SSE transport fails with "Invalid or illegal string" error');
    console.log('- Always check server documentation for correct transport type');
    console.log('- Use --help to see available transport options');
    
    process.exit(0);
  } catch (error) {
    console.log('   ❌ StreamableHTTP Error:', error.message);
    process.exit(1);
  }
}

// Start with SSE to show the problem
testSSE();