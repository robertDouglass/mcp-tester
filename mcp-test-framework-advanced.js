#!/usr/bin/env node

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const { SSEClientTransport } = require('@modelcontextprotocol/sdk/client/sse.js');
const { StreamableHttpClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
const fs = require('fs').promises;
const path = require('path');

/**
 * Advanced MCP Test Framework supporting all transport types
 */
class MCPTestFrameworkAdvanced {
  constructor(options = {}) {
    this.options = {
      verbose: options.verbose || false,
      timeout: options.timeout || 30000,
      outputDir: options.outputDir || './test-results'
    };
    this.results = [];
  }

  log(message, level = 'info') {
    if (this.options.verbose || level === 'error') {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
    }
  }

  /**
   * Create transport based on type
   */
  async createTransport(transportConfig) {
    const { type, ...config } = transportConfig;
    
    switch (type) {
      case 'stdio':
        if (!config.command) {
          throw new Error('stdio transport requires "command" parameter');
        }
        return new StdioClientTransport({
          command: config.command,
          args: config.args || [],
          env: config.env
        });
      
      case 'sse':
        if (!config.url) {
          throw new Error('SSE transport requires "url" parameter');
        }
        return new SSEClientTransport({
          url: config.url,
          headers: config.headers || {},
          requestOptions: config.requestOptions
        });
      
      case 'streamableHttp':
        if (!config.url) {
          throw new Error('streamableHttp transport requires "url" parameter');
        }
        return new StreamableHttpClientTransport({
          url: config.url,
          headers: config.headers || {},
          auth: config.auth
        });
      
      default:
        throw new Error(`Unknown transport type: ${type}`);
    }
  }

  /**
   * Connect to server using specified transport
   */
  async connectToServer(transportConfig) {
    const transportType = transportConfig.type || 'stdio';
    this.log(`Connecting to MCP server using ${transportType} transport`);
    
    try {
      const transport = await this.createTransport(transportConfig);
      
      const client = new Client({
        name: 'mcp-test-framework-advanced',
        version: '2.0.0',
      }, {
        capabilities: {}
      });

      await client.connect(transport);
      this.log(`Successfully connected via ${transportType}`, 'success');
      return { client, transport };
    } catch (error) {
      this.log(`Failed to connect via ${transportType}: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Test server with multiple transport configurations
   */
  async testServerMultiTransport(transportConfigs, testSuite = {}) {
    const results = [];
    
    for (const transportConfig of transportConfigs) {
      const testName = `${testSuite.name || 'MCP Server Test'} - ${transportConfig.type}`;
      this.log(`\n=== Testing ${testName} ===\n`);
      
      try {
        const result = await this.testServer(transportConfig, {
          ...testSuite,
          name: testName
        });
        results.push(result);
      } catch (error) {
        this.log(`Transport test failed: ${error.message}`, 'error');
        results.push({
          name: testName,
          transport: transportConfig.type,
          status: 'failed',
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * Test a single server configuration
   */
  async testServer(transportConfig, testSuite = {}) {
    const testName = testSuite.name || 'MCP Server Test';
    const startTime = Date.now();
    const result = {
      name: testName,
      transport: transportConfig.type || 'stdio',
      config: this.sanitizeConfig(transportConfig),
      startTime: new Date().toISOString(),
      tests: []
    };

    try {
      const { client, transport } = await this.connectToServer(transportConfig);

      // Run discovery tests
      if (testSuite.testDiscovery !== false) {
        await this.runDiscoveryTests(client, result);
      }

      // Run transport-specific tests
      if (testSuite.transportTests && testSuite.transportTests[transportConfig.type]) {
        const transportTests = testSuite.transportTests[transportConfig.type];
        for (const test of transportTests) {
          await this.runCustomTest(client, test, result);
        }
      }

      // Run custom tests
      if (testSuite.customTests && Array.isArray(testSuite.customTests)) {
        for (const test of testSuite.customTests) {
          await this.runCustomTest(client, test, result);
        }
      }

      // Run tool tests
      if (testSuite.toolTests && Array.isArray(testSuite.toolTests)) {
        for (const toolTest of testSuite.toolTests) {
          await this.runToolTest(client, toolTest, result);
        }
      }

      // Test connection stability
      if (testSuite.testStability !== false) {
        await this.runStabilityTests(client, result);
      }

      await client.close();
      
      result.status = 'passed';
      result.duration = Date.now() - startTime;
      
    } catch (error) {
      result.status = 'failed';
      result.error = error.message;
      result.duration = Date.now() - startTime;
    }

    this.results.push(result);
    return result;
  }

  /**
   * Sanitize configuration for logging (remove sensitive data)
   */
  sanitizeConfig(config) {
    const sanitized = { ...config };
    if (sanitized.headers) {
      sanitized.headers = Object.keys(sanitized.headers).reduce((acc, key) => {
        acc[key] = key.toLowerCase().includes('auth') ? '***' : sanitized.headers[key];
        return acc;
      }, {});
    }
    if (sanitized.auth) {
      sanitized.auth = '***';
    }
    return sanitized;
  }

  async runDiscoveryTests(client, result) {
    const discoveryTests = [
      {
        name: 'List Tools',
        fn: async () => {
          const tools = await client.listTools();
          return {
            count: tools.tools.length,
            tools: tools.tools.map(t => ({ 
              name: t.name, 
              description: t.description?.substring(0, 100) + (t.description?.length > 100 ? '...' : '')
            }))
          };
        }
      },
      {
        name: 'List Resources',
        fn: async () => {
          try {
            const resources = await client.listResources();
            return {
              count: resources.resources.length,
              resources: resources.resources.map(r => ({ 
                name: r.name, 
                description: r.description?.substring(0, 100) + (r.description?.length > 100 ? '...' : '')
              }))
            };
          } catch (error) {
            if (error.message.includes('Method not found')) {
              return { count: 0, resources: [], note: 'Server does not support resources' };
            }
            throw error;
          }
        }
      },
      {
        name: 'List Prompts',
        fn: async () => {
          try {
            const prompts = await client.listPrompts();
            return {
              count: prompts.prompts.length,
              prompts: prompts.prompts.map(p => ({ 
                name: p.name, 
                description: p.description?.substring(0, 100) + (p.description?.length > 100 ? '...' : '')
              }))
            };
          } catch (error) {
            if (error.message.includes('Method not found')) {
              return { count: 0, prompts: [], note: 'Server does not support prompts' };
            }
            throw error;
          }
        }
      }
    ];

    for (const test of discoveryTests) {
      const testResult = await this.executeTest(test.name, test.fn);
      result.tests.push(testResult);
    }
  }

  async runStabilityTests(client, result) {
    const stabilityTests = [
      {
        name: 'Rapid Sequential Requests',
        fn: async () => {
          const requests = 10;
          const start = Date.now();
          for (let i = 0; i < requests; i++) {
            await client.listTools();
          }
          const duration = Date.now() - start;
          return {
            requests,
            duration,
            avgTime: Math.round(duration / requests) + 'ms'
          };
        }
      },
      {
        name: 'Concurrent Requests',
        fn: async () => {
          const requests = 5;
          const start = Date.now();
          await Promise.all(
            Array(requests).fill(null).map(() => client.listTools())
          );
          const duration = Date.now() - start;
          return {
            requests,
            duration,
            avgTime: Math.round(duration / requests) + 'ms'
          };
        }
      }
    ];

    for (const test of stabilityTests) {
      const testResult = await this.executeTest(test.name, test.fn);
      result.tests.push(testResult);
    }
  }

  async runCustomTest(client, test, result) {
    const testResult = await this.executeTest(test.name, async () => {
      return await test.fn(client);
    });
    result.tests.push(testResult);
  }

  async runToolTest(client, toolTest, result) {
    const testResult = await this.executeTest(
      `Tool Test: ${toolTest.toolName}`,
      async () => {
        const tools = await client.listTools();
        const tool = tools.tools.find(t => t.name === toolTest.toolName);
        
        if (!tool) {
          throw new Error(`Tool "${toolTest.toolName}" not found`);
        }

        const startTime = Date.now();
        const callResult = await client.callTool({
          name: toolTest.toolName,
          arguments: toolTest.arguments || {}
        });
        const callDuration = Date.now() - startTime;

        // Run assertions if provided
        if (toolTest.assertions) {
          for (const assertion of toolTest.assertions) {
            await assertion(callResult);
          }
        }

        return {
          tool: toolTest.toolName,
          arguments: toolTest.arguments,
          duration: callDuration + 'ms',
          resultSummary: callResult.content?.[0]?.text?.substring(0, 100) + '...'
        };
      }
    );
    result.tests.push(testResult);
  }

  async executeTest(name, fn) {
    const startTime = Date.now();
    const test = {
      name,
      startTime: new Date().toISOString()
    };

    try {
      this.log(`Running test: ${name}`);
      test.result = await Promise.race([
        fn(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Test timeout')), this.options.timeout)
        )
      ]);
      test.status = 'passed';
      test.duration = Date.now() - startTime;
      this.log(`✓ ${name} (${test.duration}ms)`, 'success');
    } catch (error) {
      test.status = 'failed';
      test.error = error.message;
      test.duration = Date.now() - startTime;
      this.log(`✗ ${name}: ${error.message}`, 'error');
    }

    return test;
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.status === 'passed').length,
        failed: this.results.filter(r => r.status === 'failed').length,
        byTransport: this.getTransportSummary(),
        totalTests: this.results.reduce((acc, r) => acc + (r.tests?.length || 0), 0),
        passedTests: this.results.reduce((acc, r) => 
          acc + (r.tests?.filter(t => t.status === 'passed').length || 0), 0
        ),
        failedTests: this.results.reduce((acc, r) => 
          acc + (r.tests?.filter(t => t.status === 'failed').length || 0), 0
        )
      },
      results: this.results
    };

    // Save report to file
    await fs.mkdir(this.options.outputDir, { recursive: true });
    const reportPath = path.join(
      this.options.outputDir, 
      `mcp-test-report-${Date.now()}.json`
    );
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    this.log(`Report saved to: ${reportPath}`, 'success');
    
    return report;
  }

  getTransportSummary() {
    const summary = {};
    for (const result of this.results) {
      const transport = result.transport || 'unknown';
      if (!summary[transport]) {
        summary[transport] = { total: 0, passed: 0, failed: 0 };
      }
      summary[transport].total++;
      if (result.status === 'passed') {
        summary[transport].passed++;
      } else {
        summary[transport].failed++;
      }
    }
    return summary;
  }

  printSummary(report) {
    console.log('\n=== Test Summary ===');
    console.log(`Total Server Tests: ${report.summary.total}`);
    console.log(`Passed: ${report.summary.passed}`);
    console.log(`Failed: ${report.summary.failed}`);
    
    console.log('\n=== By Transport ===');
    for (const [transport, stats] of Object.entries(report.summary.byTransport)) {
      console.log(`${transport}: ${stats.passed}/${stats.total} passed`);
    }
    
    console.log(`\nTotal Individual Tests: ${report.summary.totalTests}`);
    console.log(`Passed: ${report.summary.passedTests}`);
    console.log(`Failed: ${report.summary.failedTests}`);
    
    if (report.summary.failed > 0) {
      console.log('\n=== Failed Tests ===');
      for (const result of report.results) {
        if (result.status === 'failed') {
          console.log(`\n${result.name} (${result.transport}): ${result.error}`);
        }
        if (result.tests) {
          for (const test of result.tests) {
            if (test.status === 'failed') {
              console.log(`  - ${test.name}: ${test.error}`);
            }
          }
        }
      }
    }
  }
}

// Export for use as a library
module.exports = { MCPTestFrameworkAdvanced };

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: mcp-test-framework-advanced <transport-type> <config...> [--verbose]');
    console.log('\nTransport types:');
    console.log('  stdio <command> [args...]');
    console.log('  sse <url> [--header "Key: Value"]');
    console.log('  streamableHttp <url> [--header "Key: Value"] [--auth "token"]');
    console.log('\nExample:');
    console.log('  mcp-test-framework-advanced stdio /path/to/server --verbose');
    console.log('  mcp-test-framework-advanced sse http://localhost:3000/mcp --header "Authorization: Bearer token"');
    process.exit(1);
  }

  const verbose = args.includes('--verbose');
  const transportType = args[0];
  
  let transportConfig = { type: transportType };
  
  // Parse transport-specific configuration
  if (transportType === 'stdio') {
    transportConfig.command = args[1];
    transportConfig.args = args.slice(2).filter(arg => arg !== '--verbose');
  } else if (transportType === 'sse' || transportType === 'streamableHttp') {
    transportConfig.url = args[1];
    transportConfig.headers = {};
    
    // Parse headers
    for (let i = 2; i < args.length; i++) {
      if (args[i] === '--header' && i + 1 < args.length) {
        const headerMatch = args[i + 1].match(/^([^:]+):\s*(.+)$/);
        if (headerMatch) {
          transportConfig.headers[headerMatch[1]] = headerMatch[2];
        }
        i++;
      } else if (args[i] === '--auth' && i + 1 < args.length) {
        transportConfig.auth = args[i + 1];
        i++;
      }
    }
  }

  const framework = new MCPTestFrameworkAdvanced({ verbose });
  
  (async () => {
    try {
      await framework.testServer(transportConfig);
      const report = await framework.generateReport();
      framework.printSummary(report);
      
      process.exit(report.summary.failed > 0 ? 1 : 0);
    } catch (error) {
      console.error('Test framework error:', error);
      process.exit(1);
    }
  })();
}