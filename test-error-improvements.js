#!/usr/bin/env node
const { MCPTestFrameworkAdvanced } = require('./lib/mcp-test-framework-advanced-v2.js');

async function testErrorImprovements() {
  console.log('Testing improved error messages in mcp-tester v2.1.0\n');
  
  const framework = new MCPTestFrameworkAdvanced({ verbose: true });
  
  // Test 1: Missing required field
  console.log('Test 1: Missing required field (should show helpful suggestions)');
  await framework.testServer(
    { type: 'streamableHttp', url: 'http://localhost:3000/mcp' },
    {
      name: 'Error Message Test - Missing Field',
      testDiscovery: false,
      testStability: false,
      toolTests: [{
        toolName: 'mittwald_server_list',
        arguments: {}, // Missing required 'output' field
        assertions: [
          async (result) => {
            console.log('This should not run due to validation error');
          }
        ]
      }]
    }
  );

  // Test 2: Invalid enum value
  console.log('\nTest 2: Invalid enum value (should show valid options)');
  await framework.testServer(
    { type: 'streamableHttp', url: 'http://localhost:3000/mcp' },
    {
      name: 'Error Message Test - Invalid Enum',
      testDiscovery: false,
      testStability: false,
      toolTests: [{
        toolName: 'mittwald_server_list',
        arguments: {
          output: 'table' // Invalid enum value
        },
        assertions: [
          async (result) => {
            console.log('This should not run due to validation error');
          }
        ]
      }]
    }
  );
  
  const report = await framework.generateReport();
  framework.printSummary(report);
}

testErrorImprovements().catch(console.error);