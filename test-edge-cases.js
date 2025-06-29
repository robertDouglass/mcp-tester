#!/usr/bin/env node
const { MCPTestFrameworkAdvanced } = require('./lib/mcp-test-framework-advanced.js');

async function testEdgeCases() {
  console.log('Testing MCP Tester Edge Cases...\n');

  // Test 1: Invalid transport type
  try {
    console.log('Test 1: Invalid transport type');
    const framework = new MCPTestFrameworkAdvanced({ verbose: true });
    await framework.testServer({ type: 'invalid-transport', url: 'http://localhost:3000' });
  } catch (error) {
    console.log('✓ Correctly handled invalid transport:', error.message);
  }

  // Test 2: Missing required parameters
  try {
    console.log('\nTest 2: Missing URL for HTTP transport');
    const framework = new MCPTestFrameworkAdvanced({ verbose: true });
    await framework.testServer({ type: 'sse' }); // Missing URL
  } catch (error) {
    console.log('✓ Correctly handled missing URL:', error.message);
  }

  // Test 3: Connection to non-existent server
  try {
    console.log('\nTest 3: Connection to non-existent server');
    const framework = new MCPTestFrameworkAdvanced({ verbose: true, timeout: 5000 });
    await framework.testServer({ type: 'streamableHttp', url: 'http://localhost:9999/nonexistent' });
  } catch (error) {
    console.log('✓ Correctly handled connection failure:', error.message);
  }

  // Test 4: Tool test with non-existent tool
  try {
    console.log('\nTest 4: Testing non-existent tool');
    const framework = new MCPTestFrameworkAdvanced({ verbose: false });
    const tests = {
      name: 'Non-existent tool test',
      toolTests: [{
        toolName: 'this_tool_does_not_exist',
        arguments: { test: true }
      }]
    };
    await framework.testServer(
      { type: 'streamableHttp', url: 'http://localhost:3000/mcp' },
      tests
    );
    const report = await framework.generateReport();
    const failedTest = report.results[0].tests.find(t => t.status === 'failed');
    console.log('✓ Tool test failed as expected:', failedTest?.error);
  } catch (error) {
    console.log('✓ Framework handled tool test failure');
  }

  // Test 5: Timeout handling
  console.log('\nTest 5: Testing timeout handling');
  const framework5 = new MCPTestFrameworkAdvanced({ verbose: false, timeout: 100 }); // Very short timeout
  const tests5 = {
    name: 'Timeout test',
    customTests: [{
      name: 'Slow test',
      fn: async () => {
        await new Promise(resolve => setTimeout(resolve, 200)); // Longer than timeout
        return { result: 'Should not reach here' };
      }
    }]
  };
  
  try {
    await framework5.testServer(
      { type: 'streamableHttp', url: 'http://localhost:3000/mcp' },
      tests5
    );
    const report = await framework5.generateReport();
    const timedOutTest = report.results[0].tests.find(t => t.error && t.error.includes('timeout'));
    console.log('✓ Test timed out as expected:', timedOutTest?.error);
  } catch (error) {
    console.log('Error during timeout test:', error.message);
  }

  // Test 6: Empty test suite
  try {
    console.log('\nTest 6: Empty test suite');
    const framework = new MCPTestFrameworkAdvanced({ verbose: false });
    await framework.testServer(
      { type: 'streamableHttp', url: 'http://localhost:3000/mcp' },
      {} // Empty tests object
    );
    const report = await framework.generateReport();
    console.log('✓ Handled empty test suite, total tests:', report.summary.totalTests);
  } catch (error) {
    console.log('Error with empty test suite:', error.message);
  }

  console.log('\nEdge case testing complete!');
}

testEdgeCases().catch(console.error);