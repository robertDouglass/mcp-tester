# MCP Tester v2.0.0 🧪

Advanced testing framework for Model Context Protocol (MCP) servers with enhanced error handling, performance testing, and comprehensive tool validation.

## What's New in v2.0.0 🚀

### Enhanced Error Handling
- Custom error classes for better debugging (`MCPTestError`, `ConnectionError`, `TestTimeoutError`)
- Detailed error codes and contextual information
- Retry logic with configurable attempts and delays

### Comprehensive Test Suites
- **Performance Testing**: Measure response times, concurrent handling, and memory stability
- **Protocol Compliance**: Validate JSON-RPC responses and error handling
- **Error Handling Tests**: Test server behavior with invalid inputs
- **Enhanced Tool Testing**: Schema validation, performance thresholds, and detailed assertions

### Improved Metrics & Reporting
- Detailed performance metrics (avg, min, max times)
- Test recommendations based on results
- Memory stability tracking
- Enhanced HTML-friendly reports

### Better Developer Experience
- More verbose and helpful error messages
- Configurable timeouts per test type
- Tool response previews
- Assertion tracking

## Installation

```bash
npm install -g @robertdouglass/mcp-tester

# Or use directly with npx
npx @robertdouglass/mcp-tester --help
```

## Quick Start

### Basic Testing
```bash
# Auto-detect transport type (recommended for HTTP servers)
mcp-tester auto http://localhost:3000/mcp --verbose

# Test stdio server
mcp-tester stdio node ./my-server.js --verbose

# Test with specific transport
mcp-tester streamableHttp http://localhost:3000/mcp --verbose
```

### Advanced Testing
```bash
# Run all test suites
mcp-tester auto http://localhost:3000/mcp \
  --verbose \
  --performance \
  --compliance \
  --error-handling \
  --timeout 60000 \
  --retry 3
```

## Programmatic Usage

```javascript
const { MCPTestFrameworkAdvanced } = require('@robertdouglass/mcp-tester');

async function testMyServer() {
  const framework = new MCPTestFrameworkAdvanced({
    verbose: true,
    timeout: 30000,
    retryAttempts: 2,
    performanceThresholds: {
      toolCall: 2000,    // Max 2s for tool calls
      discovery: 500     // Max 500ms for discovery
    }
  });

  const tests = {
    name: 'My Server Tests',
    testDiscovery: true,
    testStability: true,
    testPerformance: true,
    testProtocolCompliance: true,
    testErrorHandling: true,
    
    toolTests: [{
      toolName: 'my_tool',
      arguments: { input: 'test' },
      assertions: [
        async (result) => {
          if (!result.content) throw new Error('No content');
          if (result.content[0].type !== 'text') {
            throw new Error('Expected text content');
          }
        }
      ]
    }],
    
    customTests: [{
      name: 'Custom validation',
      fn: async (client) => {
        const tools = await client.listTools();
        return { toolCount: tools.tools.length };
      }
    }]
  };

  await framework.testServer(
    { type: 'stdio', command: 'node', args: ['./server.js'] },
    tests
  );

  const report = await framework.generateReport();
  framework.printSummary(report);
}
```

## Test Types

### 1. Discovery Tests
- Lists and validates tools, resources, and prompts
- Checks for required fields and schema completeness
- Measures discovery performance

### 2. Stability Tests
- Rapid sequential requests (20 requests)
- Concurrent request handling (10 parallel)
- Memory stability over 50 iterations
- Response time variance analysis

### 3. Performance Tests
- Tool discovery performance benchmarking
- Concurrent request handling metrics
- Individual tool execution timing
- Performance threshold validation

### 4. Protocol Compliance Tests
- JSON-RPC response format validation
- Error response structure verification
- Required field presence checks

### 5. Error Handling Tests
- Invalid tool name handling
- Malformed argument handling
- Timeout behavior verification
- Connection failure recovery

### 6. Tool Tests
- Input schema validation
- Custom assertion support
- Performance threshold checking
- Response structure validation

## Configuration Options

```javascript
{
  verbose: false,              // Detailed logging
  timeout: 30000,             // Test timeout in ms
  outputDir: './test-results', // Report output directory
  retryAttempts: 0,           // Connection retry attempts
  retryDelay: 1000,           // Delay between retries
  validateSchemas: true,      // Validate tool input schemas
  performanceThresholds: {
    toolCall: 5000,           // Max tool call duration
    discovery: 1000           // Max discovery duration
  }
}
```

## Error Classes

The framework uses custom error classes for better debugging:

- `MCPTestError`: Base error class with code and details
- `ConnectionError`: Connection-specific errors with transport info
- `TestTimeoutError`: Test timeout errors with test name and timeout value

## Report Structure

Reports include:
- Comprehensive metrics (connection attempts, total tests, assertions)
- Per-transport breakdowns
- Individual test results with timings
- Performance insights
- Recommendations for improvements
- Failed test details with error codes

## CLI Options

```bash
--verbose              Show detailed output
--timeout <ms>         Set test timeout (default: 30000)
--retry <attempts>     Number of connection retries (default: 0)
--performance          Run performance tests
--compliance           Run protocol compliance tests
--error-handling       Run error handling tests
--header "Key: Value"  Add HTTP header
--auth "token"         Add auth token
```

## Best Practices

1. **Always run with --verbose during development** to see detailed error messages
2. **Set appropriate timeouts** for your server's expected performance
3. **Use retry logic** for unreliable network conditions
4. **Write comprehensive assertions** for tool tests
5. **Monitor performance thresholds** to catch regressions

## Troubleshooting

### Connection Errors
- Check server is running and accessible
- Verify transport type matches server implementation
- Use --retry flag for flaky connections

### Timeout Errors
- Increase timeout with --timeout flag
- Check for server performance issues
- Verify network latency

### Schema Validation Errors
- Ensure tool arguments match expected schema
- Disable validation with validateSchemas: false if needed

## Contributing

Contributions welcome! Please submit issues and PRs to:
https://github.com/robertDouglass/mcp-tester

## License

MIT © Robert Douglass