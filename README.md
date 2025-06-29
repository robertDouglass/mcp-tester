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

## Testing Individual Tools

The most powerful feature of mcp-tester is testing individual MCP tools with custom arguments and assertions.

### Basic Tool Test

```javascript
const { MCPTestFrameworkAdvanced } = require('@robertdouglass/mcp-tester');

async function testMyTool() {
  const framework = new MCPTestFrameworkAdvanced({ verbose: true });
  
  await framework.testServer(
    { type: 'streamableHttp', url: 'http://localhost:3000/mcp' },
    {
      name: 'My Tool Test',
      testDiscovery: false,
      testStability: false,
      toolTests: [{
        toolName: 'my_tool',
        arguments: { 
          input: 'test data',
          format: 'json'
        },
        assertions: [
          async (result) => {
            if (!result.content) throw new Error('No content returned');
            console.log('Tool result:', result.content[0].text);
          }
        ]
      }]
    }
  );
}
```

### Multi-Step Workflow

Test multiple tools in sequence, perfect for workflows like project creation:

```javascript
async function testProjectWorkflow() {
  const framework = new MCPTestFrameworkAdvanced({ verbose: true });
  
  // Step 1: List available servers
  await framework.testServer(
    { type: 'streamableHttp', url: 'http://localhost:3000/mcp' },
    {
      name: 'Get Server List',
      toolTests: [{
        toolName: 'server_list',
        arguments: { output: 'json' },
        assertions: [
          async (result) => {
            const data = JSON.parse(result.content[0].text);
            console.log('Available servers:', data.length);
          }
        ]
      }]
    }
  );

  // Step 2: Create project using server from step 1
  await framework.testServer(
    { type: 'streamableHttp', url: 'http://localhost:3000/mcp' },
    {
      name: 'Create Project',
      toolTests: [{
        toolName: 'project_create',
        arguments: {
          description: 'My New Project',
          serverId: 'server-id-from-step-1'
        },
        assertions: [
          async (result) => {
            const response = JSON.parse(result.content[0].text);
            if (response.status !== 'success') {
              throw new Error('Project creation failed');
            }
            console.log('Project created with ID:', response.data.projectId);
          }
        ]
      }]
    }
  );
}
```

### Common Assertion Patterns

```javascript
// 1. Check response structure
async (result) => {
  if (!result.content?.[0]?.text) {
    throw new Error('Invalid response structure - no text content');
  }
}

// 2. Validate JSON response
async (result) => {
  const data = JSON.parse(result.content[0].text);
  if (data.status !== 'success') {
    throw new Error(`Operation failed: ${data.message}`);
  }
}

// 3. Performance assertion
async (result, metadata) => {
  if (metadata.duration > 5000) {
    throw new Error(`Tool too slow: ${metadata.duration}ms > 5000ms`);
  }
}

// 4. Content validation
async (result) => {
  const text = result.content[0].text;
  if (!text.includes('expected-value')) {
    throw new Error('Response missing expected content');
  }
}

// 5. Schema validation
async (result) => {
  const data = JSON.parse(result.content[0].text);
  const requiredFields = ['id', 'name', 'status'];
  
  for (const field of requiredFields) {
    if (!(field in data)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
}
```

### Real-World Example: Project Management

```javascript
// Complete example testing Mittwald project operations
async function testMittwaldProjects() {
  const framework = new MCPTestFrameworkAdvanced({ 
    verbose: true,
    performanceThresholds: { toolCall: 3000 }
  });

  const tests = {
    name: 'Mittwald Project Management Tests',
    testDiscovery: false,
    toolTests: [
      // Test 1: List projects
      {
        toolName: 'mittwald_project_list',
        arguments: { output: 'json' },
        assertions: [
          async (result) => {
            const data = JSON.parse(result.content[0].text);
            console.log(`Found ${data.data.length} projects`);
            return data.data; // Can return data for use in assertions
          }
        ]
      },
      
      // Test 2: Get specific project details
      {
        toolName: 'mittwald_project_get',
        arguments: { 
          projectId: 'your-project-id',
          output: 'json'
        },
        assertions: [
          async (result) => {
            const project = JSON.parse(result.content[0].text);
            if (!project.data.isReady) {
              throw new Error('Project is not ready');
            }
            console.log(`Project "${project.data.description}" is ready`);
          }
        ]
      },
      
      // Test 3: Create new project (commented out for safety)
      /*
      {
        toolName: 'mittwald_project_create',
        arguments: {
          description: 'Test Project',
          serverId: 'your-server-id'
        },
        assertions: [
          async (result) => {
            const response = JSON.parse(result.content[0].text);
            if (response.status === 'success') {
              console.log('✅ Project created:', response.data.projectId);
            } else {
              throw new Error('Project creation failed');
            }
          }
        ]
      }
      */
    ]
  };

  await framework.testServer(
    { type: 'streamableHttp', url: 'http://localhost:3000/mcp' },
    tests
  );

  const report = await framework.generateReport();
  framework.printSummary(report);
}
```

### CLI Tool Testing

You can also test individual tools from the command line by creating test files:

```bash
# Create a test file
echo 'module.exports = { toolTests: [{ toolName: "my_tool", arguments: {}, assertions: [] }] }' > my-test.js

# Run it (hypothetical - not implemented yet)
mcp-tester auto http://localhost:3000/mcp --test-file my-test.js
```

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