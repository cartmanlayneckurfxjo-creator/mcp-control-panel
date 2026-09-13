import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import net from 'net';
import { exec, execSync } from 'child_process';

const CONFIG_PATH = fs.existsSync('C:/Users/may/.gemini/antigravity-ide/mcp_config.json') 
  ? 'C:/Users/may/.gemini/antigravity-ide/mcp_config.json'
  : (fs.existsSync('C:/Users/may/.gemini/config/mcp_config.json')
    ? 'C:/Users/may/.gemini/config/mcp_config.json'
    : 'C:/Users/may/.gemini/antigravity/mcp-config.json');

const PORT = 7890;

const updateCache = new Map();
const CACHE_TTL = 3600000; // 1 hour

const serviceProcesses = new Map();

const MCP_SERVICES = {
  'agentmemory': {
    name: 'agentmemory',
    port: 3113,
    startCmd: 'npx -y @agentmemory/agentmemory',
    url: 'http://127.0.0.1:3113'
  }
};

function checkPort(port) {
  return new Promise((resolve) => {
    if (!port) return resolve(false);
    const socket = new net.Socket();
    socket.setTimeout(350);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, '127.0.0.1');
  });
}


function readConfig() {
  const content = fs.readFileSync(CONFIG_PATH, 'utf-8');
  return JSON.parse(content);
}

function writeConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 4), 'utf-8');
}

function extractPackageInfo(serverName, cfg) {
  if (!cfg) return null;
  const cmd = (cfg.command || '').toLowerCase();
  const args = cfg.args || [];

  if (cmd.includes('npx')) {
    for (const arg of args) {
      if (arg === '-y' || arg.startsWith('-')) continue;
      let clean = arg.split('@latest')[0];
      if (clean) return { type: 'npm', pkg: clean, fullArg: arg, name: serverName };
    }
  }

  if (cmd.includes('uv') || cmd.includes('uvx') || cmd.includes('python')) {
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === '--with' && args[i + 1]) {
        return { type: 'pypi', pkg: args[i + 1], name: serverName };
      }
      if (arg.includes('mempalace') || arg.includes('scrapling') || arg.includes('obsidian') || arg.includes('graphify')) {
        let pkgName = arg.replace(/^mcp-/, '').split('.')[0];
        if (arg.includes('mempalace')) pkgName = 'mempalace';
        if (arg.includes('scrapling')) pkgName = 'scrapling';
        if (arg.includes('obsidian')) pkgName = 'mcp-obsidian';
        if (arg.includes('graphify')) pkgName = 'graphifyy';
        return { type: 'pypi', pkg: pkgName, name: serverName };
      }
    }
  }

  return { type: 'custom', name: serverName };
}

function resolveRepoUrl(pkgInfo, pkgData) {
  if (!pkgInfo) return null;
  const pkg = pkgInfo.pkg || '';
  const serverName = (pkgInfo.name || '').toLowerCase();

  const overrides = {
    'mcp-obsidian': 'https://github.com/calclavia/mcp-obsidian',
    'obsidian': 'https://github.com/calclavia/mcp-obsidian',
    'mempalace': 'https://github.com/MemPalace/mempalace',
    'scrapling': 'https://github.com/D4Vinci/Scrapling',
    'graphify': 'https://github.com/Graphify-Labs/graphify',
    'graphifyy': 'https://github.com/Graphify-Labs/graphify',
    'context-mode': 'https://github.com/mcp-get/context-mode',
    '@playwright/mcp': 'https://github.com/microsoft/playwright-mcp',
    '@mem0/mcp': 'https://github.com/mem0ai/mem0-mcp',
    'mem0': 'https://github.com/mem0ai/mem0-mcp',
    '@upstash/context7-mcp': 'https://github.com/upstash/context7/tree/main/packages/mcp',
    'context7': 'https://github.com/upstash/context7/tree/main/packages/mcp',
    '@agentmemory/mcp': 'https://github.com/rohitg00/agentmemory/tree/main/packages/mcp',
    'agentmemory': 'https://github.com/rohitg00/agentmemory/tree/main/packages/mcp',
    'cursor-talk-to-figma-mcp': 'https://github.com/philogicae/cursor-talk-to-figma-mcp',
    'talktofigma': 'https://github.com/philogicae/cursor-talk-to-figma-mcp',
    'deepseek-thinker-mcp': 'https://github.com/deepsoul-ai/deepseek-thinker-mcp',
    'deepseek-thinker': 'https://github.com/deepsoul-ai/deepseek-thinker-mcp',
    'firecrawl-mcp': 'https://github.com/mendableai/firecrawl-mcp',
    'firecrawl': 'https://github.com/mendableai/firecrawl-mcp',
    'tavily-mcp': 'https://github.com/tavily-ai/tavily-mcp',
    'tavily': 'https://github.com/tavily-ai/tavily-mcp',
    'langfuse-mcp': 'https://github.com/langfuse/langfuse-mcp',
    'langfuse': 'https://github.com/langfuse/langfuse-mcp',
    '@21st-dev/magic': 'https://github.com/21st-dev/magic-mcp',
    'magic': 'https://github.com/21st-dev/magic-mcp',
    'penpot': 'https://design.penpot.app/',
    'omniroute': 'https://github.com/omniroute/omniroute'
  };

  if (overrides[pkg]) return overrides[pkg];
  if (overrides[serverName]) return overrides[serverName];

  if (pkg.startsWith('@modelcontextprotocol/server-')) {
    const sub = pkg.replace('@modelcontextprotocol/server-', '').replace(/[^a-z0-9]/gi, '');
    return 'https://github.com/modelcontextprotocol/servers/tree/main/src/' + sub;
  }

  if (pkgData && pkgInfo.type === 'npm') {
    const repo = pkgData.repository;
    let url = typeof repo === 'string' ? repo : (repo && repo.url ? repo.url : null);
    if (url) {
      let clean = url.replace(/^git\+/, '').replace(/\.git$/, '');
      if (clean.startsWith('git://')) clean = 'https://' + clean.slice(6);
      if (clean.startsWith('ssh://git@github.com/')) clean = 'https://github.com/' + clean.slice(22);
      if (clean.startsWith('git@github.com:')) clean = 'https://github.com/' + clean.slice(15);
      if (repo && repo.directory && clean.includes('github.com')) {
        clean = clean + '/tree/main/' + repo.directory;
      }
      return clean;
    }
    if (pkgData.homepage && !pkgData.homepage.includes('modelcontextprotocol.io')) {
      return pkgData.homepage;
    }
    return 'https://www.npmjs.com/package/' + pkg;
  }

  if (pkgData && pkgInfo.type === 'pypi') {
    const urls = pkgData.project_urls || {};
    const candidate = urls.Repository || urls.Source || urls['Source Code'] || urls.Homepage || pkgData.home_page;
    if (candidate) return candidate;
    return 'https://pypi.org/project/' + pkg + '/';
  }

  if (pkgInfo.type === 'npm' && pkg) return 'https://www.npmjs.com/package/' + pkg;
  if (pkgInfo.type === 'pypi' && pkg) return 'https://pypi.org/project/' + pkg + '/';

  return null;
}


function getLocalPythonVersion(pkg) {
  try {
    const py = execSync('python -c "import importlib.metadata; print(importlib.metadata.version(\'' + pkg + '\'))"', {
      encoding: 'utf-8',
      timeout: 2000,
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim();
    if (py && /^[0-9]/.test(py)) return py;
  } catch (e) {}

  try {
    const out = execSync('pip show ' + pkg, {
      encoding: 'utf-8',
      timeout: 2000,
      stdio: ['pipe', 'pipe', 'ignore']
    });
    const match = out.match(/^Version:\s*([^\r\n]+)/m);
    if (match) return match[1].trim();
  } catch (e) {}

  return null;
}

function compareVersions(local, latest) {
  if (!local || !latest) return false;
  if (local === latest) return false;
  const cleanLocal = local.replace(/^v/, '').split('-')[0];
  const cleanLatest = latest.replace(/^v/, '').split('-')[0];
  const lParts = cleanLocal.split('.').map(n => parseInt(n, 10) || 0);
  const rParts = cleanLatest.split('.').map(n => parseInt(n, 10) || 0);
  const len = Math.max(lParts.length, rParts.length);
  for (let i = 0; i < len; i++) {
    const l = lParts[i] || 0;
    const r = rParts[i] || 0;
    if (r > l) return true; // latest is strictly newer
    if (r < l) return false;
  }
  return false;
}

function fetchLatestNpmVersion(pkg) {
  return new Promise((resolve) => {
    const url = 'https://registry.npmjs.org/' + encodeURIComponent(pkg) + '/latest';
    https.get(url, { headers: { 'User-Agent': 'Node' } }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({
            version: json.version || null,
            data: json
          });
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

function fetchLatestPyPiVersion(pkg) {
  return new Promise((resolve) => {
    const url = 'https://pypi.org/pypi/' + encodeURIComponent(pkg) + '/json';
    https.get(url, { headers: { 'User-Agent': 'Node' } }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({
            version: json.info ? json.info.version : null,
            data: json.info || {}
          });
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

    if (req.url.startsWith('/api/open-url') && req.method === 'GET') {
    try {
      const parsedUrl = new URL(req.url, 'http://localhost:' + PORT);
      const targetUrl = parsedUrl.searchParams.get('url');
      if (targetUrl && (targetUrl.startsWith('http://') || targetUrl.startsWith('https://'))) {
        const cmd = process.platform === 'win32'
          ? 'start "" "' + targetUrl.replace(/"/g, '') + '"'
          : (process.platform === 'darwin' ? 'open "' + targetUrl + '"' : 'xdg-open "' + targetUrl + '"');
        exec(cmd, (err) => {
          if (err) console.error('Failed to open browser URL:', err);
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        return;
      }
    } catch (e) {
      console.error('Error handling open-url:', e);
    }
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid URL' }));
    return;
  }

  if (req.url === '/api/mcp' && req.method === 'GET') {
    try {
      const config = readConfig();
      const allServers = { ...(config.mcpServers || {}), ...(config.disabledMcpServers || {}) };
      const repoUrls = {};

      const services = {};
      for (const [name, cfg] of Object.entries(allServers)) {
        const pkgInfo = extractPackageInfo(name, cfg);
        const url = resolveRepoUrl(pkgInfo);
        if (url) repoUrls[name] = url;

        if (MCP_SERVICES[name]) {
          const svc = MCP_SERVICES[name];
          const isRunning = await checkPort(svc.port);
          services[name] = {
            port: svc.port,
            url: svc.url,
            isRunning: isRunning
          };
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ...config, repoUrls, services }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  if (req.url === '/api/mcp/check-updates' && req.method === 'GET') {
    try {
      const config = readConfig();
      const allServers = { ...(config.mcpServers || {}), ...(config.disabledMcpServers || {}) };
      const updates = {};
      const now = Date.now();

      const promises = Object.entries(allServers).map(async ([name, cfg]) => {
        const pkgInfo = extractPackageInfo(name, cfg);
        if (!pkgInfo) return;

        const cached = updateCache.get(name);
        if (cached && (now - cached.timestamp < CACHE_TTL)) {
          updates[name] = cached.data;
          return;
        }

        let fetched = null;
        let localVer = null;
        let hasUpdate = false;

        if (pkgInfo.type === 'pypi' && pkgInfo.pkg) {
          fetched = await fetchLatestPyPiVersion(pkgInfo.pkg);
          localVer = getLocalPythonVersion(pkgInfo.pkg);
          const latestVer = fetched ? fetched.version : null;
          hasUpdate = (localVer && latestVer) ? compareVersions(localVer, latestVer) : false;
        } else if (pkgInfo.type === 'npm' && pkgInfo.pkg) {
          fetched = await fetchLatestNpmVersion(pkgInfo.pkg);
          const latestVer = fetched ? fetched.version : null;
          const args = cfg.args || [];
          for (const arg of args) {
            if (typeof arg === 'string' && arg.includes('@') && !arg.includes('@latest')) {
              const parts = arg.split('@');
              const verCandidate = parts[parts.length - 1];
              if (/^[0-9]/.test(verCandidate)) {
                localVer = verCandidate;
                break;
              }
            }
          }
          const usesLatest = args.some(a => typeof a === 'string' && a.includes('@latest'));
          if (localVer && latestVer) {
            hasUpdate = compareVersions(localVer, latestVer);
          } else if (usesLatest) {
            localVer = 'latest';
            hasUpdate = false;
          }
        }

        const repoUrl = resolveRepoUrl(pkgInfo, fetched ? fetched.data : null);

        const resData = {
          hasUpdate: hasUpdate,
          localVersion: localVer,
          latestVersion: fetched ? fetched.version : null,
          type: pkgInfo.type,
          pkg: pkgInfo.pkg,
          repoUrl: repoUrl
        };
        updateCache.set(name, { timestamp: now, data: resData });
        updates[name] = resData;
      });

      Promise.all(promises).then(() => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ updates }));
      }).catch(err => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      });
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  if (req.url === '/api/mcp/update' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { serverName } = JSON.parse(body);
        const config = readConfig();
        const cfg = (config.mcpServers && config.mcpServers[serverName]) || 
                    (config.disabledMcpServers && config.disabledMcpServers[serverName]);

        if (!cfg) throw new Error('Server not found');

        const pkgInfo = extractPackageInfo(serverName, cfg);
        if (!pkgInfo || !pkgInfo.pkg) throw new Error('Package type not supported for auto-update');

        if (pkgInfo.type === 'npm') {
          let updated = false;
          cfg.args = (cfg.args || []).map(arg => {
            if (arg === pkgInfo.fullArg && !arg.includes('@latest')) {
              updated = true;
              return arg + '@latest';
            }
            return arg;
          });
          if (updated) writeConfig(config);

          await new Promise((res) => {
            exec('npx --yes ' + pkgInfo.pkg + '@latest --help', { timeout: 20000 }, () => res());
          });
        } else if (pkgInfo.type === 'pypi') {
          await new Promise((res) => {
            exec('C:/Users/may/.local/bin/uv.exe pip install --upgrade ' + pkgInfo.pkg, { timeout: 30000 }, (err) => {
              if (err) {
                exec('pip install --upgrade ' + pkgInfo.pkg, { timeout: 30000 }, () => res());
              } else {
                res();
              }
            });
          });
        }

        updateCache.delete(serverName);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, serverName }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (req.url === '/api/mcp/toggle' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { serverName } = JSON.parse(body);
        const config = readConfig();
        config.mcpServers = config.mcpServers || {};
        config.disabledMcpServers = config.disabledMcpServers || {};

        if (config.mcpServers[serverName]) {
          config.disabledMcpServers[serverName] = config.mcpServers[serverName];
          delete config.mcpServers[serverName];
        } else if (config.disabledMcpServers[serverName]) {
          config.mcpServers[serverName] = config.disabledMcpServers[serverName];
          delete config.disabledMcpServers[serverName];
        }

        writeConfig(config);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, config }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (req.url === '/api/mcp/service/start' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { serverName } = JSON.parse(body);
        const svc = MCP_SERVICES[serverName];
        if (!svc) throw new Error('No service configured for ' + serverName);

        const isRunning = await checkPort(svc.port);
        if (isRunning) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Already running' }));
          return;
        }

        const proc = exec(svc.startCmd, { windowsHide: true });
        serviceProcesses.set(serverName, proc);

        proc.on('exit', () => serviceProcesses.delete(serverName));
        proc.on('error', () => serviceProcesses.delete(serverName));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (req.url === '/api/mcp/service/stop' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { serverName, port } = JSON.parse(body);
        const svc = MCP_SERVICES[serverName];
        const targetPort = port || (svc ? svc.port : null);

        if (serviceProcesses.has(serverName)) {
          const proc = serviceProcesses.get(serverName);
          try {
            if (process.platform === 'win32' && proc.pid) {
              execSync('taskkill /PID ' + proc.pid + ' /T /F');
            } else {
              proc.kill('SIGTERM');
            }
          } catch(err) {}
          serviceProcesses.delete(serverName);
        }

        const portsToKill = serverName === 'agentmemory' ? [3111, 3112, 3113] : (targetPort ? [targetPort] : []);
        if (process.platform === 'win32') {
          for (const p of portsToKill) {
            try {
              const out = execSync('netstat -ano | findstr :' + p, { encoding: 'utf-8' });
              const lines = out.split('\n');
              for (const line of lines) {
                if (line.includes('LISTENING')) {
                  const parts = line.trim().split(/\s+/);
                  const pid = parts[parts.length - 1];
                  if (pid && !isNaN(pid)) {
                    execSync('taskkill /PID ' + pid + ' /T /F');
                  }
                }
              }
            } catch(err) {}
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Serve Dashboard HTML
  if (req.url === '/' || req.url === '/index.html') {
    const html = fs.readFileSync('C:/Users/may/.gemini/antigravity/scratch/mcp_panel.html', 'utf-8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log('\n=================================================');
  console.log('🚀 MCP Control Panel Live at: http://localhost:' + PORT);
  console.log('=================================================\n');
});



