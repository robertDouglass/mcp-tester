#!/usr/bin/env node

const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');

async function testProjectListing() {
  try {
    console.log('Connecting to Mittwald MCP Server...');
    const transport = new StreamableHTTPClientTransport('http://localhost:3000/mcp');
    
    const client = new Client(
      {
        name: 'mcp-tester-project-listing',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    await client.connect(transport);
    console.log('✅ Connected successfully!\n');
    
    // First, let's look for any project-related tools that might list projects
    console.log('🔍 Looking for project listing tools...');
    const tools = await client.listTools();
    const projectTools = tools.tools.filter(tool => 
      tool.name.includes('project') && 
      (tool.name.includes('list') || tool.name.includes('get'))
    );
    
    console.log('Found project-related tools:');
    projectTools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });
    console.log('');
    
    // Let's try org_list first to see what organizations are available
    console.log('🏢 Trying to list organizations...');
    try {
      const orgResult = await client.callTool({
        name: 'mittwald_org_list',
        arguments: {}
      });
      console.log('✅ Organizations listed successfully:');
      console.log(JSON.stringify(orgResult, null, 2));
    } catch (error) {
      console.log('❌ Failed to list organizations:', error.message);
    }
    console.log('');
    
    // Check if there are any resources that might contain project info
    console.log('📄 Checking available resources...');
    try {
      const resources = await client.listResources();
      console.log('Available resources:');
      resources.resources?.forEach(resource => {
        console.log(`  - ${resource.uri}: ${resource.name || 'No name'}`);
        if (resource.description) {
          console.log(`    ${resource.description}`);
        }
      });
    } catch (error) {
      console.log('❌ Failed to list resources:', error.message);
    }
    console.log('');
    
    // Try to read a resource that might contain project information
    try {
      const resources = await client.listResources();
      if (resources.resources && resources.resources.length > 0) {
        console.log('📖 Trying to read first resource for project info...');
        const firstResource = resources.resources[0];
        const resourceContent = await client.readResource({
          uri: firstResource.uri
        });
        console.log('Resource content preview:');
        console.log(JSON.stringify(resourceContent, null, 2).substring(0, 500) + '...');
      }
    } catch (error) {
      console.log('❌ Failed to read resource:', error.message);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testProjectListing();