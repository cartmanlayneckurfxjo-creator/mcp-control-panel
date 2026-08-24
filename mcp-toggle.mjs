import fs from 'fs';

const CONFIG_PATHS = [
  'C:/Users/may/.gemini/antigravity/mcp-config.json',
  'C:/Users/may/.gemini/antigravity-ide/mcp_config.json'
].filter(p => fs.existsSync(p));

const targetServer = process.argv[2];

if (!targetServer) {
  console.log('Usage: node mcp-toggle.mjs <server-name>');
  process.exit(1);
}

try {
  const primaryPath = CONFIG_PATHS[0] || 'C:/Users/may/.gemini/antigravity/mcp-config.json';
  const content = fs.readFileSync(primaryPath, 'utf-8');
  const config = JSON.parse(content);
  
  config.mcpServers = config.mcpServers || {};
  config.disabledMcpServers = config.disabledMcpServers || {};

  if (config.mcpServers[targetServer]) {
    config.disabledMcpServers[targetServer] = config.mcpServers[targetServer];
    delete config.mcpServers[targetServer];
    console.log(`🔴 Disabled server: ${targetServer}`);
  } else if (config.disabledMcpServers[targetServer]) {
    config.mcpServers[targetServer] = config.disabledMcpServers[targetServer];
    delete config.disabledMcpServers[targetServer];
    console.log(`🟢 Enabled server: ${targetServer}`);
  } else {
    console.log(`❌ Server not found: ${targetServer}`);
  }

  const json = JSON.stringify(config, null, 4);
  CONFIG_PATHS.forEach(filePath => {
    fs.writeFileSync(filePath, json, 'utf-8');
  });
} catch (e) {
  console.error('Error toggling MCP server:', e.message);
}
