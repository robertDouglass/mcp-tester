#!/usr/bin/env node

const { MCPTestFrameworkAdvanced } = require('./mcp-test-framework-advanced');

/**
 * Example script showing how to test MCP servers with all transport types
 */

async function testAllTransports() {
  const framework = new MCPTestFrameworkAdvanced({
    verbose: true,
    timeout: 30000,
    outputDir: './test-results'
  });

  // Example 1: Test Toolbase server (stdio only)
  console.log('=== Testing Toolbase Server (stdio) ===\n');
  
  const toolbaseConfig = {
    type: 'stdio',
    command: '/Users/robert/.toolbase/toolbase-runner',
    args: ['-p=proxy', '-f=/Users/robert/.toolbase/config.json', '-v=claudeCode', '-l=/Users/robert/Library/Logs/Toolbase/claudeCode-toolbase-proxy.log', '-t=49']
  };

  const toolbaseTests = {
    name: 'Toolbase MCP Server',
    testDiscovery: true,
    testStability: true,
    toolTests: [
      {
        toolName: 'brave_search_brave_web_search',
        arguments: {
          query: 'MCP testing',
          count: 2
        },
        assertions: [
          async (result) => {
            if (!result || !result.content) {
              throw new Error('No content returned');
            }
          }
        ]
      }
    ]
  };

  await framework.testServer(toolbaseConfig, toolbaseTests);

  // Example 2: Test multiple transports for a hypothetical server
  console.log('\n=== Testing Multi-Transport Server ===\n');
  
  const multiTransportConfigs = [
    {
      type: 'stdio',
      command: './example-server',
      args: ['--mode', 'stdio']
    },
    {
      type: 'sse',
      url: 'http://localhost:3000/mcp/sse',
      headers: {
        'Authorization': 'Bearer test-token'
      }
    },
    {
      type: 'streamableHttp',
      url: 'http://localhost:3000/mcp/streamable',
      headers: {
        'Authorization': 'Bearer test-token'
      }
    }
  ];

  const multiTransportTests = {
    name: 'Example MCP Server',
    testDiscovery: true,
    testStability: false, // Skip stability tests for this example
    transportTests: {
      sse: [
        {
          name: 'SSE-specific test',
          fn: async (client) => {
            // Test SSE-specific functionality
            const tools = await client.listTools();
            return { 
              message: 'SSE transport working',
              toolCount: tools.tools.length 
            };
          }
        }
      ],
      streamableHttp: [
        {
          name: 'StreamableHTTP-specific test',
          fn: async (client) => {
            // Test StreamableHTTP-specific functionality
            const tools = await client.listTools();
            return { 
              message: 'StreamableHTTP transport working',
              toolCount: tools.tools.length 
            };
          }
        }
      ]
    },
    customTests: [
      {
        name: 'Cross-transport compatibility',
        fn: async (client) => {
          // This test runs on all transports
          const tools = await client.listTools();
          if (tools.tools.length === 0) {
            throw new Error('No tools available');
          }
          return {
            success: true,
            toolCount: tools.tools.length
          };
        }
      }
    ]
  };

  // Test each transport configuration
  // Note: This will fail if the example servers aren't running
  try {
    await framework.testServerMultiTransport(multiTransportConfigs, multiTransportTests);
  } catch (error) {
    console.log('Multi-transport test skipped (servers not running):', error.message);
  }

  // Generate final report
  const report = await framework.generateReport();
  framework.printSummary(report);

  return report;
}

// Example 3: Test a specific transport with custom configuration
async function testSpecificTransport(type, config) {
  const framework = new MCPTestFrameworkAdvanced({
    verbose: true,
    timeout: 30000
  });

  const tests = {
    name: `${type} Transport Test`,
    testDiscovery: true,
    customTests: [
      {
        name: 'Transport Health Check',
        fn: async (client) => {
          const start = Date.now();
          const tools = await client.listTools();
          const latency = Date.now() - start;
          
          return {
            transport: type,
            connected: true,
            latency: latency + 'ms',
            capabilities: {
              tools: tools.tools.length > 0,
              resources: false, // Will be updated by discovery test
              prompts: false    // Will be updated by discovery test
            }
          };
        }
      }
    ]
  };

  await framework.testServer(config, tests);
  const report = await framework.generateReport();
  framework.printSummary(report);
  
  return report;
}

// Export functions for use by other scripts
module.exports = {
  testAllTransports,
  testSpecificTransport
};

// Run tests if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length > 0 && args[0] === '--transport') {
    // Test specific transport
    if (args.length < 3) {
      console.log('Usage: test-all-transports --transport <type> <url-or-command> [options...]');
      process.exit(1);
    }
    
    const type = args[1];
    let config = { type };
    
    if (type === 'stdio') {
      config.command = args[2];
      config.args = args.slice(3);
    } else if (type === 'sse' || type === 'streamableHttp') {
      config.url = args[2];
      config.headers = {};
      
      // Parse additional options
      for (let i = 3; i < args.length; i += 2) {
        if (args[i] === '--header' && i + 1 < args.length) {
          const [key, ...valueParts] = args[i + 1].split(':');
          config.headers[key.trim()] = valueParts.join(':').trim();
        } else if (args[i] === '--auth' && i + 1 < args.length) {
          config.auth = args[i + 1];
        }
      }
    }
    
    testSpecificTransport(type, config)
      .then(report => {
        process.exit(report.summary.failed > 0 ? 1 : 0);
      })
      .catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
      });
  } else {
    // Run all transport tests
    testAllTransports()
      .then(report => {
        process.exit(report.summary.failed > 0 ? 1 : 0);
      })
      .catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
      });
  }
}