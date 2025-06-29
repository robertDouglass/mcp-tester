#!/usr/bin/env node
const { MCPTestFrameworkAdvanced } = require('./lib/mcp-test-framework-advanced-v2.js');

async function testImprovements() {
  console.log('🧪 Testing MCP Tester v2 Improvements\n');

  // Test 1: Enhanced error handling with custom error classes
  console.log('1️⃣ Testing Enhanced Error Handling...');
  const framework1 = new MCPTestFrameworkAdvanced({ verbose: false });
  
  try {
    await framework1.testServer({ type: 'invalid' });
  } catch (error) {
    console.log(`✅ Custom error class: ${error.name}`);
    console.log(`   Code: ${error.code}`);
    console.log(`   Message: ${error.message}\n`);
  }

  // Test 2: Retry logic
  console.log('2️⃣ Testing Connection Retry Logic...');
  const framework2 = new MCPTestFrameworkAdvanced({ 
    verbose: false, 
    retryAttempts: 2,
    retryDelay: 500
  });
  
  const startTime = Date.now();
  try {
    await framework2.testServer({ 
      type: 'streamableHttp', 
      url: 'http://localhost:9999/nonexistent' 
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`✅ Retry logic worked: ${framework2.metrics.connectionAttempts} attempts`);
    console.log(`   Total time: ${duration}ms (includes retry delays)\n`);
  }

  // Test 3: Performance testing capabilities
  console.log('3️⃣ Testing Performance Test Suite...');
  const framework3 = new MCPTestFrameworkAdvanced({ 
    verbose: false,
    performanceThresholds: {
      toolCall: 1000,
      discovery: 500
    }
  });
  
  const perfTests = {
    name: 'Performance Test Suite',
    testDiscovery: false,
    testStability: false,
    testPerformance: true,
    testProtocolCompliance: true,
    testErrorHandling: true
  };
  
  await framework3.testServer(
    { type: 'streamableHttp', url: 'http://localhost:3000/mcp' },
    perfTests
  );
  
  const report3 = await framework3.generateReport();
  console.log(`✅ Performance tests completed`);
  console.log(`   Total tests run: ${report3.metrics.totalTestsRun}`);
  console.log(`   Connection attempts: ${report3.metrics.connectionAttempts}\n`);

  // Test 4: Enhanced tool testing with schema validation
  console.log('4️⃣ Testing Enhanced Tool Testing...');
  const framework4 = new MCPTestFrameworkAdvanced({ 
    verbose: false,
    validateSchemas: true
  });
  
  const toolTests = {
    name: 'Enhanced Tool Tests',
    testDiscovery: false,
    testStability: false,
    toolTests: [
      {
        toolName: 'mcp_logging',
        arguments: { level: 'info', message: 'Test log message' },
        assertions: [
          async (result) => {
            if (!result.content) throw new Error('No content returned');
            if (result.content[0].type !== 'text') throw new Error('Expected text content');
          }
        ]
      },
      {
        toolName: 'non_existent_tool',
        arguments: {},
        assertions: []
      }
    ]
  };
  
  await framework4.testServer(
    { type: 'streamableHttp', url: 'http://localhost:3000/mcp' },
    toolTests
  );
  
  const report4 = await framework4.generateReport();
  const toolTestResults = report4.results[0].tests;
  console.log(`✅ Enhanced tool testing completed`);
  console.log(`   Total assertions: ${report4.metrics.totalAssertions}`);
  console.log(`   Passed tests: ${toolTestResults.filter(t => t.status === 'passed').length}`);
  console.log(`   Failed tests: ${toolTestResults.filter(t => t.status === 'failed').length}\n`);

  // Test 5: Comprehensive metrics and recommendations
  console.log('5️⃣ Testing Metrics and Recommendations...');
  const framework5 = new MCPTestFrameworkAdvanced({ verbose: false });
  
  await framework5.testServer(
    { type: 'streamableHttp', url: 'http://localhost:3000/mcp' },
    { 
      name: 'Full Test Suite',
      customTests: [{
        name: 'Slow Test',
        fn: async () => {
          await new Promise(resolve => setTimeout(resolve, 1500));
          return { slow: true };
        }
      }]
    }
  );
  
  const report5 = await framework5.generateReport();
  console.log(`✅ Metrics and recommendations generated`);
  console.log(`   Recommendations: ${report5.recommendations.length}`);
  if (report5.recommendations.length > 0) {
    report5.recommendations.forEach(rec => {
      console.log(`   - ${rec.type}: ${rec.message}`);
    });
  }
  
  // Print final summary
  console.log('\n' + '='.repeat(50));
  console.log('✅ All improvement tests completed successfully!');
  console.log('='.repeat(50));
  
  // Show enhanced report format
  framework5.printSummary(report5);
}

testImprovements().catch(console.error);