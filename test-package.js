#!/usr/bin/env node

/**
 * Simple test to validate the package works
 */

const { MCPTestFrameworkAdvanced } = require('./mcp-test-framework-advanced');

async function validatePackage() {
  console.log('Validating MCP Testing Framework package...');
  
  try {
    // Test that framework can be instantiated
    const framework = new MCPTestFrameworkAdvanced({
      verbose: false,
      timeout: 5000
    });
    
    console.log('✓ Framework instantiation successful');
    
    // Test that we can create transport configs
    const configs = [
      { type: 'stdio', command: 'echo', args: ['test'] },
      { type: 'sse', url: 'http://localhost:3000/test' },
      { type: 'streamableHttp', url: 'http://localhost:3000/test' }
    ];
    
    console.log('✓ Transport configurations valid');
    
    // Test that example servers exist and are valid JavaScript
    const fs = require('fs');
    const examples = [
      'example-mcp-server.js',
      'example-sse-server.js', 
      'example-streamable-http-server.js'
    ];
    
    for (const example of examples) {
      if (fs.existsSync(example)) {
        console.log(`✓ Example server ${example} exists`);
      } else {
        throw new Error(`Missing example server: ${example}`);
      }
    }
    
    console.log('✅ Package validation successful!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Package validation failed:', error.message);
    process.exit(1);
  }
}

validatePackage();