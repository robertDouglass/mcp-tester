#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function testMCPServer(command, args = []) {
  console.log('Testing MCP Server...\n');
  
  const transport = new StdioClientTransport({
    command,
    args,
  });

  const client = new Client({
    name: 'mcp-test-client',
    version: '1.0.0',
  }, {
    capabilities: {}
  });

  try {
    await client.connect(transport);
    console.log('✓ Connected to MCP server\n');

    // List available tools
    const tools = await client.listTools();
    console.log(`Found ${tools.tools.length} tools:`);
    tools.tools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });
    console.log();

    // List available resources
    const resources = await client.listResources();
    console.log(`Found ${resources.resources.length} resources:`);
    resources.resources.forEach(resource => {
      console.log(`  - ${resource.name}: ${resource.description}`);
    });
    console.log();

    // List available prompts
    const prompts = await client.listPrompts();
    console.log(`Found ${prompts.prompts.length} prompts:`);
    prompts.prompts.forEach(prompt => {
      console.log(`  - ${prompt.name}: ${prompt.description}`);
    });
    console.log();

    // Test calling a tool if available
    if (tools.tools.length > 0) {
      const firstTool = tools.tools[0];
      console.log(`\nTesting tool: ${firstTool.name}`);
      console.log('Required parameters:', JSON.stringify(firstTool.inputSchema, null, 2));
      
      // You can uncomment and modify this to actually call the tool:
      // const result = await client.callTool({
      //   name: firstTool.name,
      //   arguments: {} // Add required parameters here
      // });
      // console.log('Tool result:', result);
    }

    await client.close();
    console.log('\n✓ Test completed successfully');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node test-mcp-client.js <command> [args...]');
  console.log('Example: node test-mcp-client.js /Users/robert/.toolbase/toolbase-runner -p=proxy -f=/Users/robert/.toolbase/config.json -v=claudeCode -l=/Users/robert/Library/Logs/Toolbase/claudeCode-toolbase-proxy.log -t=49');
  process.exit(1);
}

const command = args[0];
const commandArgs = args.slice(1);

testMCPServer(command, commandArgs);