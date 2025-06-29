#!/usr/bin/env node

const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');

async function checkPrompts() {
  try {
    console.log('Connecting to MCP Server...');
    const transport = new StreamableHTTPClientTransport('http://localhost:3000/mcp');
    
    const client = new Client(
      {
        name: 'mcp-tester-prompt-checker',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    await client.connect(transport);
    console.log('✅ Connected successfully!\n');
    
    // List available prompts
    console.log('💭 Available prompts:');
    try {
      const prompts = await client.listPrompts();
      prompts.prompts?.forEach(prompt => {
        console.log(`\n📝 ${prompt.name}`);
        if (prompt.description) {
          console.log(`   Description: ${prompt.description}`);
        }
        if (prompt.arguments) {
          console.log(`   Arguments: ${JSON.stringify(prompt.arguments, null, 2)}`);
        }
      });
      
      // Try to get one of the prompts to see what it contains
      if (prompts.prompts && prompts.prompts.length > 0) {
        console.log('\n🔍 Getting first prompt content...');
        const firstPrompt = prompts.prompts[0];
        try {
          const promptResult = await client.getPrompt({
            name: firstPrompt.name,
            arguments: {}
          });
          console.log('Prompt content:');
          console.log(JSON.stringify(promptResult, null, 2));
        } catch (error) {
          console.log('❌ Failed to get prompt content:', error.message);
        }
      }
      
    } catch (error) {
      console.log('❌ Failed to list prompts:', error.message);
    }
    
    // Check server capabilities
    console.log('\n🔧 Server capabilities:');
    const serverCapabilities = client.getServerCapabilities();
    console.log(JSON.stringify(serverCapabilities, null, 2));
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkPrompts();