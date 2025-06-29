#!/usr/bin/env node

const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');

async function comprehensiveTest() {
  try {
    console.log('🔗 Connecting to Mittwald MCP Server...');
    const transport = new StreamableHTTPClientTransport('http://localhost:3000/mcp');
    
    const client = new Client(
      {
        name: 'mcp-tester-comprehensive',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    await client.connect(transport);
    console.log('✅ Connected successfully!\n');
    
    // Get server info
    console.log('📋 Server Information:');
    console.log(`Name: ${client.getServerVersion()?.name || 'Unknown'}`);
    console.log(`Version: ${client.getServerVersion()?.version || 'Unknown'}\n`);
    
    // List all tools
    console.log('🔧 Listing all tools...');
    const tools = await client.listTools();
    console.log(`Found ${tools.tools.length} tools\n`);
    
    // Categorize tools by prefix
    const categories = {};
    tools.tools.forEach(tool => {
      const prefix = tool.name.split('_')[0];
      if (!categories[prefix]) {
        categories[prefix] = [];
      }
      categories[prefix].push(tool);
    });
    
    console.log('📊 Tools by Category:');
    Object.entries(categories).forEach(([category, toolList]) => {
      console.log(`  ${category}: ${toolList.length} tools`);
    });
    console.log('');
    
    // Show sample tools from each category
    console.log('🔍 Sample Tools by Category:');
    Object.entries(categories).forEach(([category, toolList]) => {
      console.log(`\n${category.toUpperCase()} (${toolList.length} tools):`);
      toolList.slice(0, 3).forEach(tool => {
        console.log(`  - ${tool.name}: ${tool.description}`);
      });
      if (toolList.length > 3) {
        console.log(`  ... and ${toolList.length - 3} more`);
      }
    });
    
    // Test a few tool calls
    console.log('\n🚀 Testing Tool Calls:');
    
    // Test a simple tool
    try {
      const result = await client.callTool({
        name: 'mcp_logging',
        arguments: {
          level: 'info',
          message: 'Test from mcp-tester comprehensive test'
        }
      });
      console.log('✅ mcp_logging call successful');
    } catch (error) {
      console.log('❌ mcp_logging call failed:', error.message);
    }
    
    // List resources and prompts
    try {
      const resources = await client.listResources();
      console.log(`📄 Found ${resources.resources?.length || 0} resources`);
    } catch (error) {
      console.log('❌ Failed to list resources:', error.message);
    }
    
    try {
      const prompts = await client.listPrompts();
      console.log(`💭 Found ${prompts.prompts?.length || 0} prompts`);
    } catch (error) {
      console.log('❌ Failed to list prompts:', error.message);
    }
    
    console.log('\n✅ Comprehensive test completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

comprehensiveTest();