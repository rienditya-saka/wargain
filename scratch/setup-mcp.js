const fs = require('fs');
const path = require('path');
const os = require('os');

const content = JSON.stringify({
  mcpServers: {
    supabase: {
      serverUrl: "https://mcp.supabase.com/mcp?project_ref=vteqpipiouzeovkayrki&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching"
    }
  }
}, null, 2);

const userHome = os.homedir();
const targets = [
  path.join(userHome, '.gemini', 'antigravity', 'mcp_config.json'),
  path.join(userHome, '.gemini', 'config', 'mcp_config.json'),
  path.join(__dirname, '..', '.agents', 'mcp_config.json')
];

for (const targetPath of targets) {
  try {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(targetPath, content, 'utf8');
    console.log('Saved MCP config to:', targetPath);
  } catch (err) {
    console.error('Error writing to:', targetPath, err.message);
  }
}
