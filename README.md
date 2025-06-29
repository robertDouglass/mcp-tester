# MCP Tester

[![npm version](https://badge.fury.io/js/@robertdouglass%2Fmcp-tester.svg)](https://badge.fury.io/js/@robertdouglass%2Fmcp-tester)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive testing framework for [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) servers supporting all transport types: stdio, SSE, and StreamableHTTP.

## Features

- ✅ **All Transport Types**: Test stdio, SSE, and StreamableHTTP MCP servers
- 🚀 **Zero Configuration**: Works out of the box with sensible defaults
- 🔍 **Comprehensive Testing**: Discovery, tools, resources, prompts, stability, and performance tests
- 📊 **Detailed Reporting**: JSON reports with timing, success/failure metrics, and transport breakdowns
- 🛡️ **Error Prevention**: Built-in checks for common MCP server issues (especially stdio logging problems)
- 🔧 **Extensible**: Custom test suites and assertions
- 📝 **CLI & Programmatic**: Use as command-line tool or JavaScript library

## Installation

```bash
npm install -g @robertdouglass/mcp-tester
```

Or for local installation:

```bash
npm install @robertdouglass/mcp-tester
```

## Quick Start

### Testing a stdio MCP server:

```bash
mcp-tester stdio node ./my-mcp-server.js --verbose
```

### Testing an SSE MCP server:

```bash
mcp-tester sse http://localhost:3000/mcp/sse --verbose
```

### Testing a StreamableHTTP MCP server:

```bash
mcp-tester streamableHttp http://localhost:3000/mcp --verbose
```

## Programmatic Usage

```javascript
const { MCPTestFrameworkAdvanced } = require('@robertdouglass/mcp-tester');

async function testMyServer() {
  const framework = new MCPTestFrameworkAdvanced({
    verbose: true,
    timeout: 30000,
    outputDir: './test-results'
  });

  const config = {
    type: 'stdio',
    command: 'node',
    args: ['./my-mcp-server.js']
  };

  const tests = {
    name: 'My MCP Server Tests',
    testDiscovery: true,
    testStability: true,
    toolTests: [
      {
        toolName: 'my_tool',
        arguments: { param: 'value' },
        assertions: [
          async (result) => {
            if (!result.content) throw new Error('No content returned');
          }
        ]
      }
    ]
  };

  await framework.testServer(config, tests);
  const report = await framework.generateReport();
  framework.printSummary(report);
}

testMyServer().catch(console.error);
```

## Transport Types

### 1. stdio Transport
Most common for local MCP servers. Communication via stdin/stdout.

**⚠️ Critical Note**: Never use `console.log()` in stdio MCP servers - it corrupts the JSON-RPC communication. Always use `console.error()` for logging.

```javascript
// ❌ WRONG - Breaks the server
console.log('Server started');

// ✅ CORRECT - Safe for debugging  
console.error('Server started');
```

### 2. SSE (Server-Sent Events) Transport
For HTTP-based MCP servers using Server-Sent Events.

```bash
mcp-tester sse http://localhost:3000/sse --header "Authorization: Bearer token"
```

### 3. StreamableHTTP Transport
For HTTP-based MCP servers using streaming HTTP requests.

```bash
mcp-tester streamableHttp http://localhost:3000/mcp --auth "bearer-token"
```

## Test Types

### Discovery Tests
- **List Tools**: Discovers all available tools
- **List Resources**: Discovers all available resources  
- **List Prompts**: Discovers all available prompts

### Tool Tests
- **Individual Tool Testing**: Test each tool with specific arguments
- **Assertion Support**: Custom validation of tool results
- **Error Handling**: Test invalid inputs and edge cases

### Stability Tests
- **Rapid Sequential Requests**: Tests server performance under load
- **Concurrent Requests**: Tests parallel request handling
- **Connection Reliability**: Ensures stable connections

### Performance Tests
- **Response Time Measurement**: Tracks tool execution times
- **Throughput Testing**: Measures requests per second
- **Memory Usage**: Monitors resource consumption

## Multi-Transport Testing

Test the same server across all transport types:

```javascript
const { MCPTestFrameworkAdvanced } = require('@robertdouglass/mcp-tester');

const configs = [
  { type: 'stdio', command: 'node', args: ['./server.js'] },
  { type: 'sse', url: 'http://localhost:3000/sse' },
  { type: 'streamableHttp', url: 'http://localhost:3000/mcp' }
];

const framework = new MCPTestFrameworkAdvanced({ verbose: true });
await framework.testServerMultiTransport(configs, testSuite);
```

## Configuration Options

```javascript
const framework = new MCPTestFrameworkAdvanced({
  verbose: true,          // Enable detailed logging
  timeout: 30000,         // Test timeout in milliseconds
  outputDir: './results'  // Directory for test reports
});
```

## Test Reports

All tests generate detailed JSON reports including:
- Test execution times
- Pass/fail status for each test
- Error messages and stack traces
- Tool discovery results
- Transport-specific metrics
- Performance data

Example report structure:
```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "summary": {
    "total": 3,
    "passed": 2,
    "failed": 1,
    "byTransport": {
      "stdio": { "total": 1, "passed": 1, "failed": 0 },
      "sse": { "total": 1, "passed": 1, "failed": 0 },
      "streamableHttp": { "total": 1, "passed": 0, "failed": 1 }
    }
  },
  "results": [...]
}
```

## Common Issues & Troubleshooting

### stdio Transport Issues

**Problem**: "Connection closed" errors  
**Solution**: Check for `console.log()` statements in your server code. Replace with `console.error()`.

**Problem**: Server not responding  
**Solution**: Verify server starts correctly: `node ./server.js` should produce no stdout output.

### SSE/HTTP Transport Issues

**Problem**: Connection refused  
**Solution**: Ensure server is running and accessible at the specified URL.

**Problem**: Authentication errors  
**Solution**: Verify headers and authentication tokens are correct.

## Example Servers

The package includes example servers for testing:

- `example-mcp-server.js`: Basic stdio server
- `example-sse-server.js`: SSE transport server
- `example-streamable-http-server.js`: StreamableHTTP server

Run an example:
```bash
node example-mcp-server.js &
mcp-tester stdio node ./example-mcp-server.js --verbose
```

## API Reference

### MCPTestFrameworkAdvanced

Main testing class supporting all transport types.

#### Constructor
```javascript
new MCPTestFrameworkAdvanced(options)
```

**Options:**
- `verbose` (boolean): Enable detailed logging
- `timeout` (number): Test timeout in milliseconds
- `outputDir` (string): Directory for test reports

#### Methods

##### testServer(transportConfig, testSuite)
Test a single server configuration.

**transportConfig:**
```javascript
// stdio
{ type: 'stdio', command: 'node', args: ['server.js'] }

// SSE  
{ type: 'sse', url: 'http://localhost:3000/sse', headers: {} }

// StreamableHTTP
{ type: 'streamableHttp', url: 'http://localhost:3000/mcp', auth: 'token' }
```

**testSuite:**
```javascript
{
  name: 'Test Suite Name',
  testDiscovery: true,
  testStability: true,
  customTests: [
    {
      name: 'Custom Test',
      fn: async (client) => {
        // Test implementation
        return { result: 'success' };
      }
    }
  ],
  toolTests: [
    {
      toolName: 'my_tool',
      arguments: { param: 'value' },
      assertions: [
        async (result) => {
          // Validation logic
        }
      ]
    }
  ]
}
```

##### testServerMultiTransport(configs, testSuite)
Test multiple transport configurations.

##### generateReport()
Generate detailed JSON test report.

##### printSummary(report)
Print human-readable test summary.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make changes and add tests
4. Run tests: `npm test`
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Related Projects

- [Model Context Protocol](https://modelcontextprotocol.io/) - Official MCP documentation
- [@modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk) - Official MCP SDK

## Support

- [GitHub Issues](https://github.com/robertDouglass/mcp-tester/issues)
- [MCP Documentation](https://modelcontextprotocol.io/)
- [Discord Community](https://discord.gg/anthropic) (Anthropic server)