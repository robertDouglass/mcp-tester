#!/usr/bin/env node

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class MCPTestFramework {
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

  async connectToServer(command, args = []) {
    this.log(`Connecting to MCP server: ${command} ${args.join(' ')}`);
    
    const transport = new StdioClientTransport({
      command,
      args,
    });

    const client = new Client({
      name: 'mcp-test-framework',
      version: '1.0.0',
    }, {
      capabilities: {}
    });

    try {
      await client.connect(transport);
      this.log('Successfully connected to MCP server', 'success');
      return { client, transport };
    } catch (error) {
      this.log(`Failed to connect: ${error.message}`, 'error');
      throw error;
    }
  }

  async testServer(command, args = [], testSuite = {}) {
    const testName = testSuite.name || 'MCP Server Test';
    const startTime = Date.now();
    const result = {
      name: testName,
      command: `${command} ${args.join(' ')}`,
      startTime: new Date().toISOString(),
      tests: []
    };

    try {
      const { client, transport } = await this.connectToServer(command, args);

      // Run discovery tests
      if (testSuite.testDiscovery !== false) {
        await this.runDiscoveryTests(client, result);
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

  async runDiscoveryTests(client, result) {
    const discoveryTests = [
      {
        name: 'List Tools',
        fn: async () => {
          const tools = await client.listTools();
          return {
            count: tools.tools.length,
            tools: tools.tools.map(t => ({ name: t.name, description: t.description }))
          };
        }
      },
      {
        name: 'List Resources',
        fn: async () => {
          const resources = await client.listResources();
          return {
            count: resources.resources.length,
            resources: resources.resources.map(r => ({ name: r.name, description: r.description }))
          };
        }
      },
      {
        name: 'List Prompts',
        fn: async () => {
          const prompts = await client.listPrompts();
          return {
            count: prompts.prompts.length,
            prompts: prompts.prompts.map(p => ({ name: p.name, description: p.description }))
          };
        }
      }
    ];

    for (const test of discoveryTests) {
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

        const callResult = await client.callTool({
          name: toolTest.toolName,
          arguments: toolTest.arguments || {}
        });

        // Run assertions if provided
        if (toolTest.assertions) {
          for (const assertion of toolTest.assertions) {
            await assertion(callResult);
          }
        }

        return {
          tool: toolTest.toolName,
          arguments: toolTest.arguments,
          result: callResult
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

  printSummary(report) {
    console.log('\n=== Test Summary ===');
    console.log(`Total Server Tests: ${report.summary.total}`);
    console.log(`Passed: ${report.summary.passed}`);
    console.log(`Failed: ${report.summary.failed}`);
    console.log(`\nTotal Individual Tests: ${report.summary.totalTests}`);
    console.log(`Passed: ${report.summary.passedTests}`);
    console.log(`Failed: ${report.summary.failedTests}`);
    
    if (report.summary.failed > 0) {
      console.log('\n=== Failed Tests ===');
      for (const result of report.results) {
        if (result.status === 'failed') {
          console.log(`\n${result.name}: ${result.error}`);
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
module.exports = { MCPTestFramework };

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: mcp-test-framework <command> [args...] [--verbose]');
    console.log('Example: mcp-test-framework /path/to/mcp-server --verbose');
    process.exit(1);
  }

  const verbose = args.includes('--verbose');
  const filteredArgs = args.filter(arg => arg !== '--verbose');
  const command = filteredArgs[0];
  const commandArgs = filteredArgs.slice(1);

  const framework = new MCPTestFramework({ verbose });
  
  (async () => {
    try {
      await framework.testServer(command, commandArgs);
      const report = await framework.generateReport();
      framework.printSummary(report);
      
      process.exit(report.summary.failed > 0 ? 1 : 0);
    } catch (error) {
      console.error('Test framework error:', error);
      process.exit(1);
    }
  })();
}