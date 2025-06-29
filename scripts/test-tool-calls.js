#!/usr/bin/env node

const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');

async function testSpecificTools() {
  try {
    console.log('🔗 Connecting to MCP Server...');
    const transport = new StreamableHTTPClientTransport('http://localhost:3000/mcp');
    
    const client = new Client(
      {
        name: 'mcp-tool-tester',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    await client.connect(transport);
    console.log('✅ Connected successfully!\n');
    
    // Test the logging tool that worked before
    console.log('🔧 Testing mcp_logging tool...');
    try {
      const logResult = await client.callTool({
        name: 'mcp_logging',
        arguments: {
          level: 'info',
          message: 'Testing from mcp-tester tool call verification'
        }
      });
      console.log('✅ mcp_logging successful:', JSON.stringify(logResult, null, 2));
    } catch (error) {
      console.log('❌ mcp_logging failed:', error.message);
    }
    
    // Test the elicitation example tool
    console.log('\n🔧 Testing elicitation_example tool...');
    try {
      const elicitResult = await client.callTool({
        name: 'elicitation_example',
        arguments: {}
      });
      console.log('✅ elicitation_example successful:', JSON.stringify(elicitResult, null, 2));
    } catch (error) {
      console.log('❌ elicitation_example failed:', error.message);
    }
    
    // Test a simple Mittwald tool (list)
    console.log('\n🔧 Testing mittwald_project_list tool...');
    try {
      const projectResult = await client.callTool({
        name: 'mittwald_project_list',
        arguments: {}
      });
      console.log('✅ mittwald_project_list successful:', JSON.stringify(projectResult, null, 2));
    } catch (error) {
      console.log('❌ mittwald_project_list failed:', error.message);
    }
    
    // Test another simple Mittwald tool
    console.log('\n🔧 Testing mittwald_app_versions tool...');
    try {
      const versionsResult = await client.callTool({
        name: 'mittwald_app_versions',
        arguments: {}
      });
      console.log('✅ mittwald_app_versions successful:', JSON.stringify(versionsResult, null, 2));
    } catch (error) {
      console.log('❌ mittwald_app_versions failed:', error.message);
    }
    
    console.log('\n✅ Tool testing completed!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testSpecificTools();