This project aims to create the ideal testing framework for Claude Code. 

The problem: When writing Model Context Protocol servers, they are hard to test because of lack of client tools that can connect to the server and provide feedback to Claude Code in an automated way.

My goals with this project:
1. Internet research to find the ideal existing library or tool that provides Model Context Protocol Client services to Claude code, either through a command line tool that Claude can continuously call, or through and MCP server that exposes tools for testing other MCP servers. 
2. To install and test the usage of this client on existing MCP servers. Here is the connection to an MCP server that you can use to test with:

`claude mcp add toolbase -- /Users/robert/.toolbase/toolbase-runner -p=proxy -f=/Users/robert/.toolbase/config.json -v=claudeCode -l=/Users/robert/Library/Logs/Toolbase/claudeCode-toolbase-proxy.log -t=49`

3. You can also download any of the official examples of MCP servers that you will find by studying https://modelcontextprotocol.io/introduction

4. Here's the workflow I'd like to be able to use:
	a. Me: Claude, build me an MCP server to do FOO
	b. Claude: Hi Robert, here it is, I built it. 
	c. Me: Please use our mcp-test framework to thoroughly functionally test this server
	d. Claude: <uses this tool that we're building (or finding) to thoroughly test the MCP server, needing no feedback from me>

5. Feel free to complete this project either by building something new, or by finding and validating an existing package. Document your research and decision path for me. I would prefer finding an existing tool. You can also wrap an existing tool to make it more ideal for use in a Claude Code context. 
