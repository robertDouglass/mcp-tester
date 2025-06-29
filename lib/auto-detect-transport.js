#!/usr/bin/env node

const http = require('http');
const https = require('https');
const { URL } = require('url');

/**
 * Automatically detect the MCP transport type for a given URL
 * @param {string} url - The URL to test
 * @returns {Promise<{transport: string, confidence: number, reason: string}>}
 */
async function detectTransport(url) {
  const parsedUrl = new URL(url);
  const isHttps = parsedUrl.protocol === 'https:';
  const client = isHttps ? https : http;
  
  return new Promise((resolve) => {
    const options = {
      method: 'GET',
      headers: {
        'Accept': '*/*',
        'User-Agent': 'mcp-tester/1.0'
      }
    };
    
    const req = client.request(url, options, (res) => {
      let body = '';
      
      res.on('data', chunk => {
        body += chunk.toString();
        // Only collect first 1KB
        if (body.length > 1024) {
          req.destroy();
        }
      });
      
      res.on('end', () => {
        // Analyze response to determine transport
        const headers = res.headers;
        const contentType = headers['content-type'] || '';
        
        // Check for SSE indicators
        if (headers['x-mcp-transport'] === 'sse' || 
            body.includes('text/event-stream') ||
            contentType.includes('text/event-stream')) {
          // But verify it's not actually StreamableHTTP
          if (res.statusCode === 406 || body.includes('Not Acceptable')) {
            resolve({
              transport: 'streamableHttp',
              confidence: 90,
              reason: 'Server requires event-stream but responds with 406, typical of StreamableHTTP'
            });
          } else {
            resolve({
              transport: 'sse',
              confidence: 80,
              reason: 'Server indicates SSE support'
            });
          }
          return;
        }
        
        // Check for StreamableHTTP indicators
        if (headers['x-mcp-transport'] === 'streamablehttp' ||
            headers['x-mcp-transport'] === 'streamable-http' ||
            (res.statusCode === 406 && body.includes('event-stream'))) {
          resolve({
            transport: 'streamableHttp',
            confidence: 95,
            reason: 'Server shows StreamableHTTP characteristics'
          });
          return;
        }
        
        // Check for JSON-RPC error (common in HTTP transports)
        if (body.includes('jsonrpc') && body.includes('error')) {
          try {
            const json = JSON.parse(body);
            if (json.error && json.error.message) {
              if (json.error.message.includes('event-stream')) {
                resolve({
                  transport: 'streamableHttp',
                  confidence: 85,
                  reason: 'JSON-RPC error mentions event-stream'
                });
                return;
              }
            }
          } catch (e) {
            // Not valid JSON
          }
        }
        
        // Default to streamableHttp for HTTP endpoints
        resolve({
          transport: 'streamableHttp',
          confidence: 50,
          reason: 'HTTP endpoint, assuming StreamableHTTP'
        });
      });
      
      res.on('error', () => {
        resolve({
          transport: 'unknown',
          confidence: 0,
          reason: 'Failed to connect to server'
        });
      });
    });
    
    req.on('error', (err) => {
      resolve({
        transport: 'unknown',
        confidence: 0,
        reason: `Connection error: ${err.message}`
      });
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        transport: 'unknown',
        confidence: 0,
        reason: 'Connection timeout'
      });
    });
    
    req.end();
  });
}

/**
 * Try to connect with each transport type to verify which works
 */
async function verifyTransport(url, suspectedTransport) {
  const { SSEClientTransport } = require('@modelcontextprotocol/sdk/client/sse.js');
  const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
  const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
  
  const transports = suspectedTransport === 'sse' 
    ? ['sse', 'streamableHttp'] 
    : ['streamableHttp', 'sse'];
  
  for (const transportType of transports) {
    try {
      const transport = transportType === 'sse'
        ? new SSEClientTransport(url)
        : new StreamableHTTPClientTransport(url);
      
      const client = new Client(
        { name: 'mcp-tester-detector', version: '1.0.0' },
        { capabilities: {} }
      );
      
      // Set a timeout promise
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 3000)
      );
      
      // Race between connection and timeout
      await Promise.race([
        client.connect(transport),
        timeoutPromise
      ]);
      
      // If we get here, connection succeeded
      await client.close();
      
      return {
        transport: transportType,
        confidence: 100,
        reason: 'Successfully connected and verified'
      };
    } catch (error) {
      // Try next transport
      continue;
    }
  }
  
  return null;
}

module.exports = { detectTransport, verifyTransport };

// CLI usage
if (require.main === module) {
  const url = process.argv[2];
  if (!url) {
    console.error('Usage: node auto-detect-transport.js <url>');
    process.exit(1);
  }
  
  (async () => {
    console.log(`🔍 Detecting transport for ${url}...`);
    
    const detected = await detectTransport(url);
    console.log(`\n🎯 Initial detection: ${detected.transport} (${detected.confidence}% confidence)`);
    console.log(`   Reason: ${detected.reason}`);
    
    if (detected.transport !== 'unknown') {
      console.log('\n🧪 Verifying with actual connection...');
      const verified = await verifyTransport(url, detected.transport);
      
      if (verified) {
        console.log(`✅ Confirmed: ${verified.transport}`);
        console.log(`   ${verified.reason}`);
      } else {
        console.log('❌ Could not verify transport type');
        console.log('   Neither SSE nor StreamableHTTP connections succeeded');
      }
    }
  })();
}