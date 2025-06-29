#!/usr/bin/env node

const { MCPTestFramework } = require('./mcp-test-framework');

/**
 * Example of how to use the MCP Test Framework to test MCP servers
 * This script can be customized for different testing scenarios
 */

async function runTests() {
  const framework = new MCPTestFramework({
    verbose: true,
    timeout: 30000,
    outputDir: './test-results'
  });

  // Example: Test the provided Toolbase server
  const toolbaseTest = {
    name: 'Toolbase MCP Server Test',
    testDiscovery: true,
    customTests: [
      {
        name: 'Server Capabilities Check',
        fn: async (client) => {
          // Custom test to verify server capabilities
          const tools = await client.listTools();
          
          // Check if essential tools are present
          const essentialTools = ['brave_search_brave_web_search', 'toolbase_github_create_repository'];
          const missingTools = essentialTools.filter(
            toolName => !tools.tools.some(t => t.name === toolName)
          );
          
          if (missingTools.length > 0) {
            throw new Error(`Missing essential tools: ${missingTools.join(', ')}`);
          }
          
          return {
            totalTools: tools.tools.length,
            hasEssentialTools: true
          };
        }
      }
    ],
    toolTests: [
      {
        toolName: 'brave_search_brave_web_search',
        arguments: {
          query: 'Model Context Protocol',
          count: 3
        },
        assertions: [
          async (result) => {
            if (!result || !result.content) {
              throw new Error('Tool did not return expected content');
            }
          }
        ]
      }
    ]
  };

  // Run the Toolbase server test
  console.log('Testing Toolbase MCP Server...\n');
  await framework.testServer(
    '/Users/robert/.toolbase/toolbase-runner',
    ['-p=proxy', '-f=/Users/robert/.toolbase/config.json', '-v=claudeCode', '-l=/Users/robert/Library/Logs/Toolbase/claudeCode-toolbase-proxy.log', '-t=49'],
    toolbaseTest
  );

  // Generate and display the report
  const report = await framework.generateReport();
  framework.printSummary(report);

  return report;
}

// Function to test a generic MCP server
async function testGenericServer(command, args = []) {
  const framework = new MCPTestFramework({
    verbose: true,
    timeout: 30000
  });

  const genericTest = {
    name: `Generic MCP Server Test: ${command}`,
    testDiscovery: true,
    customTests: [
      {
        name: 'Basic Connectivity',
        fn: async (client) => {
          // Just verify we can communicate with the server
          return { connected: true };
        }
      }
    ]
  };

  await framework.testServer(command, args, genericTest);
  const report = await framework.generateReport();
  framework.printSummary(report);
  
  return report;
}

// Export functions for use by other scripts
module.exports = {
  runTests,
  testGenericServer
};

// Run tests if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length > 0 && args[0] === '--generic') {
    // Test a generic server
    if (args.length < 2) {
      console.log('Usage: run-mcp-tests --generic <command> [args...]');
      process.exit(1);
    }
    
    const command = args[1];
    const commandArgs = args.slice(2);
    
    testGenericServer(command, commandArgs)
      .then(report => {
        process.exit(report.summary.failed > 0 ? 1 : 0);
      })
      .catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
      });
  } else {
    // Run default tests
    runTests()
      .then(report => {
        process.exit(report.summary.failed > 0 ? 1 : 0);
      })
      .catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
      });
  }
}