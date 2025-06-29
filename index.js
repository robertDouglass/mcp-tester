#!/usr/bin/env node

/**
 * MCP Tester - Main entry point
 * Comprehensive testing framework for Model Context Protocol servers
 */

const { MCPTestFrameworkAdvanced } = require('./lib/mcp-test-framework-advanced-v2.js');

module.exports = {
  MCPTestFrameworkAdvanced,
  // Re-export for backwards compatibility
  MCPTestFramework: MCPTestFrameworkAdvanced
};

// If called directly as a script, run the CLI
if (require.main === module) {
  require('./lib/mcp-test-framework-advanced-v2.js');
}