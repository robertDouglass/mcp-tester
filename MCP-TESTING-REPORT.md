# MCP Testing Framework Report

## Executive Summary

After extensive research and testing, I've identified and implemented a comprehensive solution for testing Model Context Protocol (MCP) servers within Claude Code. The solution combines existing tools with a custom testing framework that provides automated, thorough testing capabilities.

## Research Findings

### 1. Existing MCP Client Tools

#### A. **mcptools** (Recommended for CLI Testing)
- **Repository**: github.com/f/mcptools
- **Language**: Go
- **Features**:
  - Command-line interface for interacting with MCP servers
  - Supports both stdio and HTTP transport
  - Mock server capabilities for testing
  - Proxy server functionality
  - Interactive shell mode
- **Installation**: `go install github.com/f/mcptools/cmd/mcptools@latest`
- **Status**: ✅ Successfully tested with Toolbase server

#### B. **MCP Inspector** (Recommended for Visual Debugging)
- **Repository**: github.com/modelcontextprotocol/inspector
- **Features**:
  - Web-based UI for testing and debugging
  - CLI mode for automation
  - Protocol bridge supporting multiple transports
  - Visual inspection of tools, resources, and prompts
- **Installation**: `npx @modelcontextprotocol/inspector`
- **Status**: ✅ Successfully installed and runs

#### C. **mcp-test-client**
- **Repository**: github.com/crazyrabbitLTC/mcp-test-client
- **Language**: TypeScript
- **Features**:
  - Jest integration for automated testing
  - Mock calculator server for testing
- **Status**: ⚠️ Requires additional setup

#### D. **mcp-client-server**
- **Repository**: github.com/willccbb/mcp-client-server
- **Features**:
  - Acts as both MCP server and client
  - Useful for testing during development
  - No need to reset application between tests
- **Status**: ⚠️ Not tested

### 2. Official MCP SDK

The official `@modelcontextprotocol/sdk` provides comprehensive client and server implementations:
- TypeScript/JavaScript support
- Multiple transport mechanisms (stdio, HTTP/SSE, WebSocket)
- Full protocol implementation
- Example servers and clients

## Implemented Solution

I've created a comprehensive MCP testing framework that combines the best of existing tools with custom functionality tailored for Claude Code usage. The framework now supports all three MCP transport types: stdio, SSE, and StreamableHTTP.

### Components

1. **mcp-test-framework.js**: Core testing framework (stdio only)
   - Automated connection and testing
   - Discovery tests (tools, resources, prompts)
   - Custom test support
   - Tool execution tests
   - JSON report generation
   - Test timing and performance metrics

2. **mcp-test-framework-advanced.js**: Advanced multi-transport framework
   - Support for all three transport types (stdio, SSE, StreamableHTTP)
   - Transport-specific configuration and testing
   - Stability and performance tests
   - Concurrent request testing
   - Transport-aware reporting

3. **test-all-transports.js**: Multi-transport test runner
   - Tests servers across all transport types
   - Transport-specific test suites
   - Cross-transport compatibility testing

4. **run-mcp-tests.js**: Test runner with pre-configured tests
   - Default test suite for Toolbase server
   - Generic server testing capability
   - Extensible test configurations

5. **Example Servers** (for testing each transport):
   - **example-mcp-server.js**: Simple stdio server
   - **example-sse-server.js**: SSE transport server with Express
   - **example-streamable-http-server.js**: StreamableHTTP server with resources

## Usage Guide

### For Claude Code Workflow

#### Testing All Transport Types

1. **Test stdio transport**:
   ```bash
   node mcp-test-framework-advanced.js stdio /path/to/server --verbose
   ```

2. **Test SSE transport**:
   ```bash
   node mcp-test-framework-advanced.js sse http://localhost:3000/sse --header "Authorization: Bearer token"
   ```

3. **Test StreamableHTTP transport**:
   ```bash
   node mcp-test-framework-advanced.js streamableHttp http://localhost:3000/mcp --auth "token"
   ```

4. **Test all transports for a server**:
   ```bash
   node test-all-transports.js
   ```

5. **Test specific transport programmatically**:
   ```javascript
   const { MCPTestFrameworkAdvanced } = require('./mcp-test-framework-advanced');
   
   const framework = new MCPTestFrameworkAdvanced({ verbose: true });
   
   // Test multiple transports
   const configs = [
     { type: 'stdio', command: './server', args: ['--stdio'] },
     { type: 'sse', url: 'http://localhost:3000/sse' },
     { type: 'streamableHttp', url: 'http://localhost:3000/mcp' }
   ];
   
   await framework.testServerMultiTransport(configs, {
     name: 'My MCP Server',
     testDiscovery: true,
     transportTests: {
       sse: [{
         name: 'SSE Keep-Alive Test',
         fn: async (client) => {
           // Test SSE-specific features
           return { status: 'connected' };
         }
       }]
     }
   });
   ```

### Test Results

All tests generate detailed JSON reports in the `test-results/` directory with:
- Test execution times
- Pass/fail status for each test
- Error messages and stack traces
- Tool discovery results
- Custom test outcomes

## Recommendations

### For Your Workflow

1. **Primary Testing Tool**: Use the custom `mcp-test-framework.js` as it provides:
   - Programmatic access for Claude Code
   - Detailed test reports
   - Extensible test suites
   - No manual intervention required

2. **Debugging**: Use MCP Inspector for visual debugging when needed:
   ```bash
   npx @modelcontextprotocol/inspector <server-command>
   ```

3. **Quick CLI Testing**: Use mcptools for quick manual tests:
   ```bash
   mcptools tools <server-command>
   mcptools call <tool-name> -p '{"param": "value"}' <server-command>
   ```

### Best Practices

1. **Test Structure**:
   - Always start with discovery tests
   - Test each tool with valid inputs
   - Test error handling with invalid inputs
   - Verify response schemas

2. **Automation**:
   - Integrate tests into your development workflow
   - Run tests after each server modification
   - Keep test reports for comparison

3. **Error Handling**:
   - Test timeout scenarios
   - Test malformed requests
   - Verify graceful error responses

## Conclusion

The implemented testing framework provides a robust solution for testing MCP servers within Claude Code. It combines the reliability of the official SDK with custom functionality designed for automated testing workflows. The framework is extensible, well-documented, and ready for immediate use in your development process.

### Key Advantages

1. **Zero Manual Intervention**: Tests run completely automatically
2. **Comprehensive Coverage**: Tests discovery, tools, and custom scenarios
3. **Detailed Reporting**: JSON reports with full test details
4. **Extensible Design**: Easy to add new test types and assertions
5. **Claude Code Integration**: Designed specifically for your workflow

The solution successfully addresses all requirements outlined in your project goals, providing a seamless testing experience for MCP server development.