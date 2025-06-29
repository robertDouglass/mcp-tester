# Claude MCP Testing Framework Instructions

## Overview
This directory contains a comprehensive MCP (Model Context Protocol) testing framework that supports all three transport types: stdio, SSE, and StreamableHTTP. Use this framework to automatically test MCP servers without manual intervention.

## Quick Start

### Testing an MCP Server

1. **For stdio transport (most common)**:
```bash
node /Users/robert/Code/mcp-tester/mcp-test-framework-advanced.js stdio <your-server-command> [args...] --verbose
```

2. **For SSE transport**:
```bash
node /Users/robert/Code/mcp-tester/mcp-test-framework-advanced.js sse <server-url> --header "Authorization: Bearer token" --verbose
```

3. **For StreamableHTTP transport**:
```bash
node /Users/robert/Code/mcp-tester/mcp-test-framework-advanced.js streamableHttp <server-url> --auth "token" --verbose
```

## Detailed Testing Instructions

### Step 1: Build the MCP Server
When the user asks you to build an MCP server, create it as usual in their project directory.

### Step 2: Basic Testing
After building the server, test it immediately:

```javascript
// In the user's project directory, create test-mcp.js
const { MCPTestFrameworkAdvanced } = require('/Users/robert/Code/mcp-tester/mcp-test-framework-advanced');

async function testMyServer() {
  const framework = new MCPTestFrameworkAdvanced({
    verbose: true,
    timeout: 30000,
    outputDir: './mcp-test-results'
  });

  // For stdio server
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
      // Add specific tool tests here
      {
        toolName: 'my_tool_name',
        arguments: { /* tool arguments */ },
        assertions: [
          async (result) => {
            if (!result.content) throw new Error('No content returned');
            // Add more assertions as needed
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

Then run: `node test-mcp.js`

### Step 3: Multi-Transport Testing
If the server supports multiple transports:

```javascript
// Create test-all-transports.js
const { MCPTestFrameworkAdvanced } = require('/Users/robert/Code/mcp-tester/mcp-test-framework-advanced');

async function testAllTransports() {
  const framework = new MCPTestFrameworkAdvanced({ verbose: true });

  const configs = [
    { type: 'stdio', command: 'node', args: ['./server.js', '--stdio'] },
    { type: 'sse', url: 'http://localhost:3000/sse' },
    { type: 'streamableHttp', url: 'http://localhost:3000/mcp' }
  ];

  const tests = {
    name: 'Multi-Transport Tests',
    testDiscovery: true,
    transportTests: {
      sse: [{
        name: 'SSE-specific test',
        fn: async (client) => {
          // SSE-specific testing
          return { status: 'ok' };
        }
      }],
      streamableHttp: [{
        name: 'StreamableHTTP-specific test',
        fn: async (client) => {
          // StreamableHTTP-specific testing
          return { status: 'ok' };
        }
      }]
    }
  };

  await framework.testServerMultiTransport(configs, tests);
  const report = await framework.generateReport();
  framework.printSummary(report);
}

testAllTransports().catch(console.error);
```

## Testing Existing Tools

### Example: Testing Each Tool
When testing an MCP server, enumerate all tools and test them:

```javascript
const { MCPTestFrameworkAdvanced } = require('/Users/robert/Code/mcp-tester/mcp-test-framework-advanced');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

async function discoverAndTestTools() {
  // First, discover available tools
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['./my-server.js']
  });
  
  const client = new Client({ name: 'tool-discovery', version: '1.0.0' }, {});
  await client.connect(transport);
  
  const tools = await client.listTools();
  await client.close();
  
  // Now create tests for each tool
  const framework = new MCPTestFrameworkAdvanced({ verbose: true });
  
  const toolTests = tools.tools.map(tool => ({
    toolName: tool.name,
    arguments: generateTestArgs(tool.inputSchema), // You'll need to implement this
    assertions: [
      async (result) => {
        if (!result.content) throw new Error(`${tool.name} returned no content`);
      }
    ]
  }));
  
  await framework.testServer(
    { type: 'stdio', command: 'node', args: ['./my-server.js'] },
    { name: 'Comprehensive Tool Tests', toolTests }
  );
}
```

## Important Guidelines

### 1. Always Test After Building
After creating any MCP server, immediately test it:
```bash
node /Users/robert/Code/mcp-tester/mcp-test-framework-advanced.js stdio node ./server.js --verbose
```

### 2. Check Test Results
Test results are saved as JSON in the specified output directory. Always check:
- All tools are discovered correctly
- All tool calls succeed
- Response times are reasonable
- No errors in stability tests

### 3. Common Test Patterns

**For calculation tools:**
```javascript
{
  toolName: 'calculate',
  arguments: { operation: 'add', a: 5, b: 3 },
  assertions: [
    async (result) => {
      const text = result.content[0].text;
      if (!text.includes('8')) throw new Error('Incorrect calculation');
    }
  ]
}
```

**For data retrieval tools:**
```javascript
{
  toolName: 'get_data',
  arguments: { id: 'test-123' },
  assertions: [
    async (result) => {
      if (!result.content) throw new Error('No data returned');
      if (result.content[0].type !== 'text') throw new Error('Wrong content type');
    }
  ]
}
```

**For async operations:**
```javascript
{
  toolName: 'async_operation',
  arguments: { delay: 1000 },
  assertions: [
    async (result) => {
      // Test should complete within reasonable time
      if (!result.content) throw new Error('Async operation failed');
    }
  ]
}
```

### 4. Error Scenarios to Test
Always test error conditions:
- Invalid arguments
- Missing required parameters  
- Out-of-range values
- Malformed input

### 5. Performance Testing
The framework automatically includes performance tests:
- Rapid sequential requests (10 requests in sequence)
- Concurrent requests (5 requests in parallel)
- Individual tool execution timing

## Troubleshooting

### Connection Errors
If you see "Connection closed" errors:
1. Ensure the server command is correct
2. Check the server starts without errors: `node ./server.js`
3. Verify transport configuration matches server implementation

### Method Not Found
If you see "Method not found" for resources/prompts:
- This is normal if the server doesn't implement these features
- The framework handles this gracefully

### Timeout Errors
Increase timeout if needed:
```javascript
const framework = new MCPTestFrameworkAdvanced({
  verbose: true,
  timeout: 60000 // 60 seconds
});
```

## Complete Working Example

Here's a complete example to copy and adapt:

```javascript
#!/usr/bin/env node
// File: test-my-mcp-server.js

const { MCPTestFrameworkAdvanced } = require('/Users/robert/Code/mcp-tester/mcp-test-framework-advanced');

async function runTests() {
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
    name: 'My MCP Server Test Suite',
    testDiscovery: true,
    testStability: true,
    customTests: [
      {
        name: 'Server Health Check',
        fn: async (client) => {
          const tools = await client.listTools();
          if (tools.tools.length === 0) {
            throw new Error('No tools available');
          }
          return { 
            healthy: true, 
            toolCount: tools.tools.length 
          };
        }
      }
    ],
    toolTests: [
      // Add your tool-specific tests here
    ]
  };

  try {
    await framework.testServer(config, tests);
    const report = await framework.generateReport();
    framework.printSummary(report);
    
    if (report.summary.failed > 0) {
      console.error('\n❌ Tests failed!');
      process.exit(1);
    } else {
      console.log('\n✅ All tests passed!');
    }
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  }
}

runTests();
```

Run with: `node test-my-mcp-server.js`

## Remember
- Always use absolute paths when referencing the testing framework
- Test results are saved as JSON for later analysis
- The framework handles all three transport types
- No manual intervention is required - tests run completely automatically