#!/bin/bash

echo "🤖 Demonstrating how auto-detect helps Claude..."
echo ""
echo "❌ What Claude was doing (fails/hangs):"
echo "   npx @robertdouglass/mcp-tester sse http://localhost:3000/mcp"
echo ""
echo "✅ What Claude should do now (auto-detects correct transport):"
echo "   npx @robertdouglass/mcp-tester auto http://localhost:3000/mcp"
echo ""
echo "Running auto-detect test..."
echo ""

npx mcp-tester auto http://localhost:3000/mcp