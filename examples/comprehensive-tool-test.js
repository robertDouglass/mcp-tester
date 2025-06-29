#!/usr/bin/env node
const { MCPTestFrameworkAdvanced } = require('../lib/mcp-test-framework-advanced-v2.js');

async function comprehensiveToolTest() {
  console.log('🧪 Comprehensive MCP Tool Testing Example\n');

  const framework = new MCPTestFrameworkAdvanced({
    verbose: true,
    timeout: 10000,
    retryAttempts: 1,
    performanceThresholds: {
      toolCall: 2000,
      discovery: 500
    }
  });

  const tests = {
    name: 'Comprehensive Tool Test Suite',
    testDiscovery: true,
    testStability: true,
    testPerformance: true,
    testProtocolCompliance: true,
    testErrorHandling: true,
    
    // Custom tests for specific scenarios
    customTests: [
      {
        name: 'Tool Discovery and Validation',
        fn: async (client) => {
          const tools = await client.listTools();
          
          // Validate all tools have required fields
          const validationResults = tools.tools.map(tool => {
            const issues = [];
            if (!tool.name) issues.push('Missing name');
            if (!tool.description) issues.push('Missing description');
            if (!tool.inputSchema && tool.name !== 'no_input_tool') {
              issues.push('Missing input schema');
            }
            
            return {
              tool: tool.name,
              valid: issues.length === 0,
              issues
            };
          });
          
          const invalidTools = validationResults.filter(r => !r.valid);
          
          return {
            totalTools: tools.tools.length,
            validTools: validationResults.filter(r => r.valid).length,
            invalidTools: invalidTools.length,
            issues: invalidTools
          };
        }
      },
      {
        name: 'Batch Tool Testing',
        fn: async (client) => {
          const tools = await client.listTools();
          const testableTools = tools.tools.slice(0, 5); // Test first 5 tools
          
          const results = [];
          for (const tool of testableTools) {
            try {
              const start = Date.now();
              const result = await client.callTool({
                name: tool.name,
                arguments: generateSampleArgs(tool.inputSchema)
              });
              
              results.push({
                tool: tool.name,
                success: true,
                duration: Date.now() - start,
                hasContent: result.content && result.content.length > 0
              });
            } catch (error) {
              results.push({
                tool: tool.name,
                success: false,
                error: error.message
              });
            }
          }
          
          return {
            tested: results.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            avgDuration: Math.round(
              results.filter(r => r.duration).reduce((a, r) => a + r.duration, 0) / 
              results.filter(r => r.duration).length
            ),
            results: results
          };
        }
      }
    ],
    
    // Specific tool tests with detailed assertions
    toolTests: [
      {
        toolName: 'mcp_logging',
        arguments: { 
          level: 'info', 
          message: 'Test message from comprehensive test' 
        },
        assertions: [
          async (result) => {
            // Check response structure
            if (!result.content || !Array.isArray(result.content)) {
              throw new Error('Invalid response structure');
            }
          },
          async (result) => {
            // Check content type
            if (result.content[0].type !== 'text') {
              throw new Error('Expected text content type');
            }
          },
          async (result) => {
            // Check content includes success indication
            const text = result.content[0].text || '';
            if (!text.toLowerCase().includes('logged') && !text.toLowerCase().includes('success')) {
              throw new Error('Response does not indicate success');
            }
          }
        ]
      },
      {
        toolName: 'mittwald_project_list',
        arguments: {},
        assertions: [
          async (result) => {
            // Should return content
            if (!result.content || result.content.length === 0) {
              throw new Error('No content returned');
            }
          },
          async (result) => {
            // Content should be text
            if (result.content[0].type !== 'text') {
              throw new Error('Expected text content');
            }
          }
        ]
      },
      {
        toolName: 'elicitation_example',
        arguments: { prompt: 'Test elicitation' },
        assertions: [
          async (result) => {
            // Should handle elicitation pattern
            if (!result.content) {
              throw new Error('Elicitation should return content');
            }
          }
        ]
      }
    ]
  };

  // Test against your server
  await framework.testServer(
    { 
      type: 'streamableHttp', 
      url: 'http://localhost:3000/mcp',
      headers: {
        'User-Agent': 'MCP-Tester/2.0'
      }
    },
    tests
  );

  // Generate and display report
  const report = await framework.generateReport();
  framework.printSummary(report);

  // Show detailed results for failed tests
  if (report.summary.failedTests > 0) {
    console.log('\n❌ Failed Test Details:');
    report.results.forEach(result => {
      result.tests.filter(t => t.status === 'failed').forEach(test => {
        console.log(`\n   Test: ${test.name}`);
        console.log(`   Error: ${test.error}`);
        if (test.errorDetails) {
          console.log(`   Details: ${JSON.stringify(test.errorDetails, null, 2)}`);
        }
      });
    });
  }

  // Show performance insights
  console.log('\n📊 Performance Insights:');
  report.results.forEach(result => {
    const perfTests = result.tests.filter(t => 
      t.name.includes('performance') || t.result?.duration
    );
    
    perfTests.forEach(test => {
      if (test.result?.avgTime) {
        console.log(`   ${test.name}: avg ${test.result.avgTime}ms`);
      }
    });
  });

  return report.summary.failed === 0;
}

// Helper function to generate sample arguments
function generateSampleArgs(schema) {
  if (!schema || !schema.properties) return {};
  
  const args = {};
  for (const [key, prop] of Object.entries(schema.properties)) {
    switch (prop.type) {
      case 'string':
        args[key] = prop.default || 'test-value';
        break;
      case 'number':
        args[key] = prop.default || 1;
        break;
      case 'boolean':
        args[key] = prop.default || false;
        break;
      case 'array':
        args[key] = [];
        break;
      case 'object':
        args[key] = {};
        break;
    }
  }
  
  return args;
}

// Run the test
comprehensiveToolTest()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });