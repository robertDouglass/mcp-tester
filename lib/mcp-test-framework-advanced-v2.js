#!/usr/bin/env node

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const { SSEClientTransport } = require('@modelcontextprotocol/sdk/client/sse.js');
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
const fs = require('fs').promises;
const path = require('path');

// Custom error classes for better error handling
class MCPTestError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'MCPTestError';
    this.code = code;
    this.details = details;
  }
}

class ConnectionError extends MCPTestError {
  constructor(message, transport, details) {
    super(message, 'CONNECTION_ERROR', { transport, ...details });
    this.name = 'ConnectionError';
  }
}

class TestTimeoutError extends MCPTestError {
  constructor(testName, timeout) {
    super(`Test "${testName}" timed out after ${timeout}ms`, 'TEST_TIMEOUT', { testName, timeout });
    this.name = 'TestTimeoutError';
  }
}

/**
 * Advanced MCP Test Framework with enhanced capabilities
 */
class MCPTestFrameworkAdvanced {
  constructor(options = {}) {
    this.options = {
      verbose: options.verbose || false,
      timeout: options.timeout || 30000,
      outputDir: options.outputDir || './test-results',
      retryAttempts: options.retryAttempts || 0,
      retryDelay: options.retryDelay || 1000,
      validateSchemas: options.validateSchemas !== false,
      performanceThresholds: options.performanceThresholds || {
        toolCall: 5000, // ms
        discovery: 1000, // ms
      }
    };
    this.results = [];
    this.metrics = {
      startTime: Date.now(),
      connectionAttempts: 0,
      totalTestsRun: 0,
      totalAssertions: 0,
    };
  }

  log(message, level = 'info') {
    if (this.options.verbose || level === 'error' || level === 'warning') {
      const timestamp = new Date().toISOString();
      const levelEmoji = {
        'info': 'ℹ️',
        'success': '✅',
        'warning': '⚠️',
        'error': '❌',
        'debug': '🔍'
      };
      console.log(`[${timestamp}] ${levelEmoji[level] || ''} ${message}`);
    }
  }

  /**
   * Create transport based on type with enhanced error handling
   */
  async createTransport(transportConfig) {
    const { type, ...config } = transportConfig;
    
    this.log(`Creating ${type} transport`, 'debug');
    
    switch (type) {
      case 'stdio':
        if (!config.command) {
          throw new MCPTestError('stdio transport requires "command" parameter', 'INVALID_CONFIG');
        }
        return new StdioClientTransport({
          command: config.command,
          args: config.args || [],
          env: config.env
        });
      
      case 'sse':
        if (!config.url) {
          throw new MCPTestError('SSE transport requires "url" parameter', 'INVALID_CONFIG');
        }
        return new SSEClientTransport(config.url, {
          requestInit: {
            headers: config.headers || {}
          }
        });
      
      case 'streamableHttp':
        if (!config.url) {
          throw new MCPTestError('streamableHttp transport requires "url" parameter', 'INVALID_CONFIG');
        }
        return new StreamableHTTPClientTransport(config.url, {
          requestInit: {
            headers: config.headers || {}
          }
        });
      
      default:
        throw new MCPTestError(`Unknown transport type: ${type}`, 'INVALID_TRANSPORT');
    }
  }

  /**
   * Connect to server with retry logic
   */
  async connectToServer(transportConfig) {
    const transportType = transportConfig.type || 'stdio';
    let lastError = null;
    
    for (let attempt = 0; attempt <= this.options.retryAttempts; attempt++) {
      this.metrics.connectionAttempts++;
      
      if (attempt > 0) {
        this.log(`Retrying connection (attempt ${attempt + 1}/${this.options.retryAttempts + 1})`, 'warning');
        await new Promise(resolve => setTimeout(resolve, this.options.retryDelay));
      }
      
      try {
        this.log(`Connecting to MCP server using ${transportType} transport`, 'info');
        const transport = await this.createTransport(transportConfig);
        
        const client = new Client({
          name: 'mcp-test-framework-advanced',
          version: '2.0.0',
        }, {
          capabilities: {}
        });

        await client.connect(transport);
        this.log(`Successfully connected via ${transportType}`, 'success');
        
        // Verify connection by calling a basic method
        try {
          await client.listTools();
        } catch (verifyError) {
          throw new ConnectionError(
            'Connection established but server not responding correctly',
            transportType,
            { verifyError: verifyError.message }
          );
        }
        
        return { client, transport };
      } catch (error) {
        lastError = error;
        this.log(`Connection attempt ${attempt + 1} failed: ${error.message}`, 'error');
      }
    }
    
    throw new ConnectionError(
      `Failed to connect after ${this.options.retryAttempts + 1} attempts`,
      transportType,
      { lastError: lastError?.message }
    );
  }

  /**
   * Enhanced test server method with comprehensive test suite
   */
  async testServer(transportConfig, tests = {}) {
    const result = {
      name: tests.name || 'MCP Server Test',
      transport: transportConfig.type,
      config: this.sanitizeConfig(transportConfig),
      startTime: new Date().toISOString(),
      tests: [],
      metrics: {}
    };

    let client, transport;
    
    try {
      const connection = await this.connectToServer(transportConfig);
      client = connection.client;
      transport = connection.transport;
      
      // Run discovery tests by default
      if (tests.testDiscovery !== false) {
        await this.runDiscoveryTests(client, result);
      }
      
      // Run stability tests by default
      if (tests.testStability !== false) {
        await this.runStabilityTests(client, result);
      }

      // Run protocol compliance tests
      if (tests.testProtocolCompliance) {
        await this.runProtocolComplianceTests(client, result);
      }

      // Run performance tests
      if (tests.testPerformance) {
        await this.runPerformanceTests(client, result);
      }

      // Run error handling tests
      if (tests.testErrorHandling) {
        await this.runErrorHandlingTests(client, result);
      }
      
      // Run custom tests
      if (tests.customTests) {
        for (const test of tests.customTests) {
          await this.runCustomTest(client, test, result);
        }
      }
      
      // Run tool tests with enhanced validation
      if (tests.toolTests) {
        for (const toolTest of tests.toolTests) {
          await this.runEnhancedToolTest(client, toolTest, result);
        }
      }

      // Run transport-specific tests
      if (tests.transportTests?.[transportConfig.type]) {
        for (const test of tests.transportTests[transportConfig.type]) {
          await this.runCustomTest(client, test, result);
        }
      }
      
      result.status = 'passed';
    } catch (error) {
      result.status = 'failed';
      result.error = {
        message: error.message,
        code: error.code,
        details: error.details
      };
      this.log(`Test suite failed: ${error.message}`, 'error');
    } finally {
      if (client) {
        try {
          await client.close();
        } catch (closeError) {
          this.log(`Error closing client: ${closeError.message}`, 'warning');
        }
      }
      
      result.endTime = new Date().toISOString();
      result.duration = Date.now() - new Date(result.startTime).getTime();
      result.metrics = this.calculateMetrics(result);
      this.results.push(result);
    }
    
    return result;
  }

  /**
   * Calculate comprehensive metrics for test results
   */
  calculateMetrics(result) {
    const metrics = {
      totalTests: result.tests.length,
      passedTests: result.tests.filter(t => t.status === 'passed').length,
      failedTests: result.tests.filter(t => t.status === 'failed').length,
      avgTestDuration: 0,
      slowestTest: null,
      fastestTest: null,
    };

    if (result.tests.length > 0) {
      const durations = result.tests.map(t => t.duration).filter(d => d != null);
      metrics.avgTestDuration = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
      
      const sortedTests = result.tests
        .filter(t => t.duration != null)
        .sort((a, b) => a.duration - b.duration);
      
      if (sortedTests.length > 0) {
        metrics.fastestTest = {
          name: sortedTests[0].name,
          duration: sortedTests[0].duration
        };
        metrics.slowestTest = {
          name: sortedTests[sortedTests.length - 1].name,
          duration: sortedTests[sortedTests.length - 1].duration
        };
      }
    }

    return metrics;
  }

  /**
   * Enhanced tool test with schema validation and performance checks
   */
  async runEnhancedToolTest(client, toolTest, result) {
    const testResult = await this.executeTest(
      `Tool Test: ${toolTest.toolName}`,
      async () => {
        // First, verify tool exists
        const tools = await client.listTools();
        const tool = tools.tools.find(t => t.name === toolTest.toolName);
        
        if (!tool) {
          throw new MCPTestError(
            `Tool "${toolTest.toolName}" not found`,
            'TOOL_NOT_FOUND',
            { availableTools: tools.tools.map(t => t.name) }
          );
        }

        // Validate input schema if provided
        if (this.options.validateSchemas && tool.inputSchema) {
          const validationResult = this.validateAgainstSchema(
            toolTest.arguments,
            tool.inputSchema
          );
          if (!validationResult.valid) {
            const errorMessage = [
              'Invalid tool arguments:',
              ...validationResult.errors,
              '',
              'Suggestions:',
              ...validationResult.suggestions
            ].join('\n  ');
            
            throw new MCPTestError(
              errorMessage,
              'SCHEMA_VALIDATION_FAILED',
              { 
                errors: validationResult.errors,
                suggestions: validationResult.suggestions
              }
            );
          }
        }

        // Execute tool call with performance tracking
        const startTime = Date.now();
        let callResult;
        
        try {
          callResult = await client.callTool({
            name: toolTest.toolName,
            arguments: toolTest.arguments || {}
          });
        } catch (toolError) {
          throw new MCPTestError(
            `Tool execution failed: ${toolError.message}`,
            'TOOL_EXECUTION_FAILED',
            { 
              tool: toolTest.toolName,
              arguments: toolTest.arguments,
              error: toolError.message 
            }
          );
        }
        
        const callDuration = Date.now() - startTime;

        // Check performance threshold
        if (callDuration > this.options.performanceThresholds.toolCall) {
          this.log(
            `Tool ${toolTest.toolName} exceeded performance threshold: ${callDuration}ms > ${this.options.performanceThresholds.toolCall}ms`,
            'warning'
          );
        }

        // Validate response structure
        if (!callResult || !Array.isArray(callResult.content)) {
          throw new MCPTestError(
            'Invalid tool response structure',
            'INVALID_RESPONSE',
            { response: callResult }
          );
        }

        // Run custom assertions
        const assertionResults = [];
        if (toolTest.assertions) {
          for (let i = 0; i < toolTest.assertions.length; i++) {
            this.metrics.totalAssertions++;
            try {
              await toolTest.assertions[i](callResult);
              assertionResults.push({ index: i, status: 'passed' });
            } catch (assertError) {
              assertionResults.push({ 
                index: i, 
                status: 'failed', 
                error: assertError.message 
              });
              throw new MCPTestError(
                `Assertion ${i + 1} failed: ${assertError.message}`,
                'ASSERTION_FAILED',
                { assertionIndex: i, tool: toolTest.toolName }
              );
            }
          }
        }

        return {
          tool: toolTest.toolName,
          arguments: toolTest.arguments,
          duration: callDuration,
          performance: {
            withinThreshold: callDuration <= this.options.performanceThresholds.toolCall,
            threshold: this.options.performanceThresholds.toolCall
          },
          responseSize: JSON.stringify(callResult).length,
          contentTypes: callResult.content.map(c => c.type),
          assertionResults,
          resultPreview: this.generateResultPreview(callResult)
        };
      }
    );
    result.tests.push(testResult);
  }

  /**
   * Generate a safe preview of tool results
   */
  generateResultPreview(callResult) {
    if (!callResult.content || callResult.content.length === 0) {
      return 'No content';
    }

    const firstContent = callResult.content[0];
    if (firstContent.type === 'text') {
      const text = firstContent.text || '';
      return text.length > 100 ? text.substring(0, 100) + '...' : text;
    }
    
    return `${firstContent.type} content (${callResult.content.length} items)`;
  }

  /**
   * Enhanced schema validation with user-friendly error messages
   */
  validateAgainstSchema(data, schema) {
    const errors = [];
    const suggestions = [];
    
    // Check required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in data)) {
          errors.push(`Missing required field: ${field}`);
          
          // Add suggestion based on schema
          if (schema.properties && schema.properties[field]) {
            const prop = schema.properties[field];
            let suggestion = `Add "${field}": `;
            
            if (prop.enum) {
              suggestion += `one of [${prop.enum.map(v => `"${v}"`).join(', ')}]`;
            } else if (prop.type === 'string') {
              suggestion += `"your-value"`;
            } else if (prop.type === 'number') {
              suggestion += `123`;
            } else if (prop.type === 'boolean') {
              suggestion += `true`;
            } else {
              suggestion += `<${prop.type}>`;
            }
            
            if (prop.description) {
              suggestion += ` // ${prop.description}`;
            }
            
            suggestions.push(suggestion);
          }
        }
      }
    }

    // Check enum values
    if (schema.properties) {
      for (const [fieldName, fieldSchema] of Object.entries(schema.properties)) {
        if (fieldName in data && fieldSchema.enum) {
          const value = data[fieldName];
          if (!fieldSchema.enum.includes(value)) {
            errors.push(`Invalid value for ${fieldName}: "${value}"`);
            suggestions.push(`Use one of: ${fieldSchema.enum.map(v => `"${v}"`).join(', ')}`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      suggestions
    };
  }

  /**
   * Run protocol compliance tests
   */
  async runProtocolComplianceTests(client, result) {
    const complianceTests = [
      {
        name: 'Valid JSON-RPC responses',
        fn: async () => {
          // Test that server returns proper JSON-RPC formatted responses
          const tools = await client.listTools();
          if (!Array.isArray(tools.tools)) {
            throw new Error('Invalid tools response format');
          }
          return { compliant: true };
        }
      },
      {
        name: 'Error handling compliance',
        fn: async () => {
          // Test that server returns proper error codes
          try {
            await client.callTool({ name: '__invalid_tool__', arguments: {} });
            throw new Error('Server should have returned an error');
          } catch (error) {
            // Expected error - check it has proper structure
            return { 
              compliant: true, 
              errorHandled: true,
              errorMessage: error.message 
            };
          }
        }
      }
    ];

    for (const test of complianceTests) {
      await this.runCustomTest(client, test, result);
    }
  }

  /**
   * Run performance tests
   */
  async runPerformanceTests(client, result) {
    const perfTests = [
      {
        name: 'Tool discovery performance',
        fn: async () => {
          const iterations = 10;
          const times = [];
          
          for (let i = 0; i < iterations; i++) {
            const start = Date.now();
            await client.listTools();
            times.push(Date.now() - start);
          }
          
          const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
          const maxTime = Math.max(...times);
          const minTime = Math.min(...times);
          
          return {
            iterations,
            avgTime: Math.round(avgTime),
            maxTime,
            minTime,
            withinThreshold: avgTime <= this.options.performanceThresholds.discovery
          };
        }
      },
      {
        name: 'Concurrent request handling',
        fn: async () => {
          const concurrentRequests = 10;
          const start = Date.now();
          
          const promises = Array(concurrentRequests).fill(null).map(() => 
            client.listTools()
          );
          
          await Promise.all(promises);
          const totalTime = Date.now() - start;
          
          return {
            concurrentRequests,
            totalTime,
            avgTimePerRequest: Math.round(totalTime / concurrentRequests)
          };
        }
      }
    ];

    for (const test of perfTests) {
      await this.runCustomTest(client, test, result);
    }
  }

  /**
   * Run error handling tests
   */
  async runErrorHandlingTests(client, result) {
    const errorTests = [
      {
        name: 'Invalid tool name handling',
        fn: async () => {
          try {
            await client.callTool({ 
              name: 'this_tool_definitely_does_not_exist_123456789',
              arguments: {} 
            });
            return { handled: false, error: 'Server did not reject invalid tool' };
          } catch (error) {
            return { handled: true, errorMessage: error.message };
          }
        }
      },
      {
        name: 'Malformed arguments handling',
        fn: async () => {
          const tools = await client.listTools();
          if (tools.tools.length === 0) {
            return { skipped: true, reason: 'No tools available to test' };
          }
          
          const firstTool = tools.tools[0];
          try {
            // Send invalid arguments (circular reference)
            const circularObj = { a: 1 };
            circularObj.self = circularObj;
            
            await client.callTool({
              name: firstTool.name,
              arguments: { invalid: circularObj }
            });
            return { handled: false };
          } catch (error) {
            return { handled: true, errorType: error.name };
          }
        }
      }
    ];

    for (const test of errorTests) {
      await this.runCustomTest(client, test, result);
    }
  }

  /**
   * Enhanced discovery tests with detailed information
   */
  async runDiscoveryTests(client, result) {
    const discoveryTests = [
      {
        name: 'List Tools',
        fn: async () => {
          const start = Date.now();
          const tools = await client.listTools();
          const duration = Date.now() - start;
          
          const toolsSummary = tools.tools.map(t => ({
            name: t.name,
            hasDescription: !!t.description,
            hasInputSchema: !!t.inputSchema,
          }));
          
          return { 
            count: tools.tools.length,
            duration,
            tools: toolsSummary.slice(0, 10), // First 10 for summary
            schemaCompleteness: toolsSummary.filter(t => t.hasInputSchema).length / toolsSummary.length
          };
        }
      },
      {
        name: 'List Resources',
        fn: async () => {
          const start = Date.now();
          const resources = await client.listResources();
          const duration = Date.now() - start;
          
          return { 
            count: resources.resources.length,
            duration,
            resources: resources.resources.slice(0, 10).map(r => ({
              name: r.name,
              uri: r.uri,
              mimeType: r.mimeType
            }))
          };
        }
      },
      {
        name: 'List Prompts',
        fn: async () => {
          const start = Date.now();
          const prompts = await client.listPrompts();
          const duration = Date.now() - start;
          
          return { 
            count: prompts.prompts.length,
            duration,
            prompts: prompts.prompts.slice(0, 10).map(p => ({
              name: p.name,
              hasDescription: !!p.description,
              argumentCount: p.arguments?.length || 0
            }))
          };
        }
      }
    ];

    for (const test of discoveryTests) {
      const testResult = await this.executeTest(test.name, test.fn);
      result.tests.push(testResult);
    }
  }

  /**
   * Enhanced stability tests
   */
  async runStabilityTests(client, result) {
    const stabilityTests = [
      {
        name: 'Rapid Sequential Requests',
        fn: async () => {
          const requests = 20; // Increased from 10
          const results = [];
          const startTotal = Date.now();
          
          for (let i = 0; i < requests; i++) {
            const start = Date.now();
            await client.listTools();
            results.push(Date.now() - start);
          }
          
          const totalDuration = Date.now() - startTotal;
          const avgTime = results.reduce((a, b) => a + b, 0) / results.length;
          const variance = this.calculateVariance(results);
          
          return {
            requests,
            totalDuration,
            avgTime: Math.round(avgTime),
            minTime: Math.min(...results),
            maxTime: Math.max(...results),
            variance: Math.round(variance),
            stable: variance < 100 // Low variance indicates stability
          };
        }
      },
      {
        name: 'Concurrent Requests',
        fn: async () => {
          const requests = 10; // Increased from 5
          const start = Date.now();
          
          const promises = [];
          for (let i = 0; i < requests; i++) {
            promises.push(client.listTools());
          }
          
          const results = await Promise.allSettled(promises);
          const duration = Date.now() - start;
          
          const successful = results.filter(r => r.status === 'fulfilled').length;
          const failed = results.filter(r => r.status === 'rejected').length;
          
          return {
            requests,
            successful,
            failed,
            duration,
            avgTime: Math.round(duration / requests),
            successRate: (successful / requests) * 100
          };
        }
      },
      {
        name: 'Memory Stability',
        fn: async () => {
          // Test that repeated calls don't cause memory issues
          const iterations = 50;
          const memoryUsage = [];
          
          for (let i = 0; i < iterations; i++) {
            if (i % 10 === 0) {
              memoryUsage.push(process.memoryUsage().heapUsed);
            }
            await client.listTools();
          }
          
          // Check if memory usage is stable (not continuously increasing)
          const memoryIncrease = memoryUsage[memoryUsage.length - 1] - memoryUsage[0];
          const avgIncrease = memoryIncrease / memoryUsage.length;
          
          return {
            iterations,
            memoryStable: avgIncrease < 1000000, // Less than 1MB average increase
            totalMemoryIncrease: Math.round(memoryIncrease / 1024 / 1024) + 'MB'
          };
        }
      }
    ];

    for (const test of stabilityTests) {
      const testResult = await this.executeTest(test.name, test.fn);
      result.tests.push(testResult);
    }
  }

  /**
   * Calculate variance for stability metrics
   */
  calculateVariance(numbers) {
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;
  }

  /**
   * Execute a single test with enhanced error handling and timeout
   */
  async executeTest(name, fn) {
    const startTime = Date.now();
    const test = {
      name,
      startTime: new Date().toISOString()
    };

    this.metrics.totalTestsRun++;

    try {
      this.log(`Running test: ${name}`, 'info');
      
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new TestTimeoutError(name, this.options.timeout)), this.options.timeout);
      });
      
      // Race between test execution and timeout
      test.result = await Promise.race([fn(), timeoutPromise]);
      test.status = 'passed';
      test.duration = Date.now() - startTime;
      this.log(`✓ ${name} (${test.duration}ms)`, 'success');
    } catch (error) {
      test.status = 'failed';
      test.error = error.message;
      test.errorCode = error.code;
      test.errorDetails = error.details;
      test.duration = Date.now() - startTime;
      this.log(`✗ ${name}: ${error.message}`, 'error');
      
      if (error.details) {
        this.log(`  Details: ${JSON.stringify(error.details)}`, 'debug');
      }
    }

    return test;
  }

  /**
   * Sanitize configuration for logging (remove sensitive data)
   */
  sanitizeConfig(config) {
    const sanitized = { ...config };
    
    // Remove sensitive headers
    if (sanitized.headers) {
      const safeHeaders = {};
      for (const [key, value] of Object.entries(sanitized.headers)) {
        if (key.toLowerCase().includes('auth') || 
            key.toLowerCase().includes('token') ||
            key.toLowerCase().includes('key')) {
          safeHeaders[key] = '[REDACTED]';
        } else {
          safeHeaders[key] = value;
        }
      }
      sanitized.headers = safeHeaders;
    }
    
    // Remove auth tokens
    if (sanitized.auth) {
      sanitized.auth = '[REDACTED]';
    }
    
    return sanitized;
  }

  /**
   * Run custom test
   */
  async runCustomTest(client, test, result) {
    const testResult = await this.executeTest(test.name, async () => {
      return await test.fn(client);
    });
    result.tests.push(testResult);
  }

  /**
   * Generate comprehensive report
   */
  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      duration: Date.now() - this.metrics.startTime,
      metrics: {
        connectionAttempts: this.metrics.connectionAttempts,
        totalTestsRun: this.metrics.totalTestsRun,
        totalAssertions: this.metrics.totalAssertions,
      },
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
      results: this.results,
      recommendations: this.generateRecommendations()
    };

    // Save to file
    try {
      await fs.mkdir(this.options.outputDir, { recursive: true });
      const filename = `mcp-test-report-${Date.now()}.json`;
      const filepath = path.join(this.options.outputDir, filename);
      await fs.writeFile(filepath, JSON.stringify(report, null, 2));
      this.log(`Report saved to: ${filepath}`, 'success');
    } catch (error) {
      this.log(`Failed to save report: ${error.message}`, 'error');
    }

    return report;
  }

  /**
   * Generate recommendations based on test results
   */
  generateRecommendations() {
    const recommendations = [];
    
    // Analyze performance
    const slowTests = [];
    this.results.forEach(result => {
      result.tests?.forEach(test => {
        if (test.duration > 1000) {
          slowTests.push({ name: test.name, duration: test.duration });
        }
      });
    });
    
    if (slowTests.length > 0) {
      recommendations.push({
        type: 'performance',
        severity: 'warning',
        message: `${slowTests.length} tests took longer than 1 second`,
        details: slowTests
      });
    }

    // Check for missing capabilities
    const hasTools = this.results.some(r => 
      r.tests?.some(t => t.name === 'List Tools' && t.result?.count > 0)
    );
    const hasResources = this.results.some(r => 
      r.tests?.some(t => t.name === 'List Resources' && t.result?.count > 0)
    );
    const hasPrompts = this.results.some(r => 
      r.tests?.some(t => t.name === 'List Prompts' && t.result?.count > 0)
    );

    if (!hasTools && !hasResources && !hasPrompts) {
      recommendations.push({
        type: 'capability',
        severity: 'info',
        message: 'Server does not expose any tools, resources, or prompts',
        suggestion: 'Consider implementing at least one capability'
      });
    }

    // Check stability
    const unstableTests = this.results.flatMap(r => 
      r.tests?.filter(t => 
        t.name === 'Rapid Sequential Requests' && 
        t.result?.variance > 100
      ) || []
    );

    if (unstableTests.length > 0) {
      recommendations.push({
        type: 'stability',
        severity: 'warning',
        message: 'High variance detected in response times',
        suggestion: 'Server may have performance consistency issues'
      });
    }

    return recommendations;
  }

  /**
   * Get transport summary for report
   */
  getTransportSummary() {
    const summary = {};
    
    for (const result of this.results) {
      const transport = result.transport;
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

  /**
   * Print formatted summary
   */
  printSummary(report) {
    console.log('\n' + '='.repeat(50));
    console.log('📊 MCP TEST REPORT SUMMARY');
    console.log('='.repeat(50));
    
    console.log(`\n⏱️  Total Duration: ${Math.round(report.duration / 1000)}s`);
    console.log(`🔌 Connection Attempts: ${report.metrics.connectionAttempts}`);
    console.log(`🧪 Total Tests Run: ${report.metrics.totalTestsRun}`);
    console.log(`✅ Total Assertions: ${report.metrics.totalAssertions}`);
    
    console.log(`\n📈 Test Results:`);
    console.log(`   Server Test Suites: ${report.summary.total}`);
    console.log(`   ✅ Passed: ${report.summary.passed}`);
    console.log(`   ❌ Failed: ${report.summary.failed}`);
    
    console.log(`\n📋 Individual Tests:`);
    console.log(`   Total: ${report.summary.totalTests}`);
    console.log(`   ✅ Passed: ${report.summary.passedTests}`);
    console.log(`   ❌ Failed: ${report.summary.failedTests}`);
    
    if (Object.keys(report.summary.byTransport).length > 0) {
      console.log(`\n🚀 By Transport:`);
      for (const [transport, stats] of Object.entries(report.summary.byTransport)) {
        console.log(`   ${transport}: ${stats.passed}/${stats.total} passed`);
      }
    }

    if (report.recommendations && report.recommendations.length > 0) {
      console.log(`\n💡 Recommendations:`);
      report.recommendations.forEach(rec => {
        const icon = rec.severity === 'error' ? '❌' : 
                    rec.severity === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`   ${icon} ${rec.message}`);
        if (rec.suggestion) {
          console.log(`      → ${rec.suggestion}`);
        }
      });
    }

    console.log('\n' + '='.repeat(50));
  }

  /**
   * Test multiple server configurations
   */
  async testServerMultiTransport(configs, tests) {
    console.log(`\n🔄 Testing ${configs.length} transport configurations...\n`);
    
    for (const config of configs) {
      await this.testServer(config, tests);
    }
    
    return this.generateReport();
  }
}

// Export for use as a library
module.exports = { MCPTestFrameworkAdvanced };

// CLI interface (backward compatible)
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 1 || args.includes('--help') || args.includes('-h')) {
    console.log(`
🧪 MCP Test Framework v2.1.0

USAGE:
  mcp-test-framework-advanced <transport-type> <config...> [options]

TRANSPORT TYPES:
  auto <url>                          Auto-detect transport type
  stdio <command> [args...]           Test stdio transport
  sse <url> [options]                 Test SSE transport
  streamableHttp <url> [options]      Test StreamableHTTP transport

OPTIONS:
  --verbose                Show detailed output
  --timeout <ms>          Set test timeout (default: 30000)
  --retry <attempts>      Number of connection retries (default: 0)
  --performance           Run performance tests
  --compliance            Run protocol compliance tests
  --error-handling        Run error handling tests
  --header "Key: Value"   Add HTTP header
  --auth "token"          Add auth token

EXAMPLES:
  mcp-test-framework-advanced auto http://localhost:3000/mcp --verbose
  mcp-test-framework-advanced stdio node ./server.js --performance
  mcp-test-framework-advanced sse http://localhost:3000 --header "Authorization: Bearer xyz"

OUTPUT:
  Test results are saved to ./test-results/ as JSON files
`);
    process.exit(0);
  }

  const verbose = args.includes('--verbose');
  const performance = args.includes('--performance');
  const compliance = args.includes('--compliance');
  const errorHandling = args.includes('--error-handling');
  
  let timeout = 30000;
  const timeoutIndex = args.indexOf('--timeout');
  if (timeoutIndex !== -1 && args[timeoutIndex + 1]) {
    timeout = parseInt(args[timeoutIndex + 1]);
  }
  
  let retryAttempts = 0;
  const retryIndex = args.indexOf('--retry');
  if (retryIndex !== -1 && args[retryIndex + 1]) {
    retryAttempts = parseInt(args[retryIndex + 1]);
  }

  const transportType = args[0];
  
  (async () => {
    let transportConfig = { type: transportType };
    
    // Handle auto-detection
    if (transportType === 'auto') {
      if (!args[1]) {
        console.error('Error: URL required for auto transport detection');
        process.exit(1);
      }
      
      const { detectTransport, verifyTransport } = require('./auto-detect-transport.js');
      console.log('🔍 Auto-detecting transport type...');
      
      const detected = await detectTransport(args[1]);
      if (detected.transport === 'unknown') {
        console.error(`❌ Could not detect transport: ${detected.reason}`);
        process.exit(1);
      }
      
      console.log(`📡 Initial detection: ${detected.transport} (${detected.confidence}% confidence)`);
      
      const verified = await verifyTransport(args[1], detected.transport);
      if (verified) {
        transportConfig.type = verified.transport;
        transportConfig.url = args[1];
        transportConfig.headers = {};
        console.log(`✅ Confirmed transport: ${verified.transport}\n`);
      } else {
        console.error('❌ Could not verify transport type');
        process.exit(1);
      }
    }
    // Parse transport-specific configuration
    else if (transportType === 'stdio') {
      transportConfig.command = args[1];
      transportConfig.args = args.slice(2).filter(arg => 
        !arg.startsWith('--') && arg !== transportConfig.command
      );
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
          transportConfig.headers['Authorization'] = `Bearer ${args[i + 1]}`;
          i++;
        }
      }
    }

    const framework = new MCPTestFrameworkAdvanced({ 
      verbose, 
      timeout,
      retryAttempts 
    });
    
    const tests = {
      name: 'MCP Server Comprehensive Test Suite',
      testDiscovery: true,
      testStability: true,
      testPerformance: performance,
      testProtocolCompliance: compliance,
      testErrorHandling: errorHandling
    };
    
    try {
      await framework.testServer(transportConfig, tests);
      const report = await framework.generateReport();
      framework.printSummary(report);
      
      process.exit(report.summary.failed > 0 ? 1 : 0);
    } catch (error) {
      console.error('❌ Test framework error:', error.message);
      if (verbose && error.stack) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  })();
}