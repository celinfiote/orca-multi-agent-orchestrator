const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { exec, spawn } = require('child_process');

const PORT = process.env.PORT || 54321;
const PUBLIC_DIR = path.join(__dirname, 'public');

// Multi-Agent State
const clients = new Set();
let history = [];
let agentStatus = {
  gemini1: { id: 'gemini1', name: 'Gemini 1 (VFX & Shaders)', status: 'Pronto / Conectado', details: 'Shaders 2D, Partículas, Iluminação', lastUpdate: Date.now() },
  gemini2: { id: 'gemini2', name: 'Gemini 2 (Supervisor & Core)', status: 'Pronto / Conectado', details: 'Orquestração, Gameplay, UI/HUD, Net', lastUpdate: Date.now() },
  gemini3: { id: 'gemini3', name: 'Gemini 3 (Worldgen & Biomas)', status: 'Pronto / Conectado', details: 'Worldgen, Biomas, Cavernas, Dungeons', lastUpdate: Date.now() },
  gemini4: { id: 'gemini4', name: 'Gemini 4 (NPC AI & Combate)', status: 'Pronto / Conectado', details: 'IA de NPCs, FSM, Behavior Trees, Combate', lastUpdate: Date.now() },
  glm:     { id: 'glm',     name: 'GLM 5.2 (Engine & GDScript Core)', status: 'Pronto / Conectado', details: 'GDScript Core, Funções Puras, Fórmulas', lastUpdate: Date.now() }
};

let currentStatus = {
  agent: 'global',
  text: 'Orca Live Preview — 5 Agentes Conectados',
  timestamp: Date.now(),
  details: 'Aguardando ações dos agentes...'
};

// MIME Types
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.bmp': 'image/bmp'
};

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try {
      res.write(payload);
    } catch (e) {
      clients.delete(res);
    }
  }
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

function loadClusterState() {
  // CORREÇÃO REAL (2026-08-30 — achado do usuário: "aqui diz que os agentes gemini
  // ainda tem cuota, porem todos estão esgotados"): este caminho apontava pra
  // `helios-gemini3\tools\cluster_state.json`, uma cópia ABANDONADA que nada mais
  // escreve (parada há 13h+ no momento do achado). O arquivo que a auditoria REAL
  // (`core/cluster_manager.js audit`, chamada pelo daemon a cada 60s) de fato
  // atualiza é `core/cluster_state.json` — este era o mesmo bug que o comentário no
  // topo de cluster_manager.js já registrava como corrigido em 2026-08-28, mas o
  // código aqui nunca foi de fato alterado (a correção ficou só na intenção/
  // changelog, não no arquivo). Corrigido de verdade agora, apontando pro STATE_FILE
  // canônico do cluster_manager.js.
  const statePath = path.join(__dirname, '..', 'core', 'cluster_state.json');
  if (fs.existsSync(statePath)) {
    try {
      return JSON.parse(fs.readFileSync(statePath, 'utf8'));
    } catch(e) {}
  }
  return null;
}

  // SSE Stream Endpoint
  if (pathname === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    res.write('\n');
    clients.add(res);

    const clusterState = loadClusterState();
    // Send initial snapshot with all agents, history and cluster quota state
    res.write(`event: init\ndata: ${JSON.stringify({ history, currentStatus, agentStatus, clusterState })}\n\n`);

    req.on('close', () => {
      clients.delete(res);
    });
    return;
  }

  // API Endpoints
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      let data = {};
      try {
        if (body) data = JSON.parse(body);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }

      if (pathname === '/api/show') {
        const agentKey = (data.agent || 'gemini2').toLowerCase();
        if (!agentStatus[agentKey]) {
          agentStatus[agentKey] = { id: agentKey, name: agentKey, status: 'Ativo', details: '', lastUpdate: Date.now() };
        }

        const item = {
          id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
          timestamp: Date.now(),
          agent: agentKey,
          agentName: agentStatus[agentKey].name,
          title: data.title || 'Imagem sem título',
          description: data.description || '',
          filePath: data.filePath || '',
          url: data.url || (data.filePath ? `/file?path=${encodeURIComponent(data.filePath)}` : ''),
          tags: data.tags || [agentKey],
          meta: data.meta || {}
        };
        history.unshift(item);
        if (history.length > 150) history.pop();

        if (data.status) {
          agentStatus[agentKey].status = data.status;
          agentStatus[agentKey].details = data.description || '';
          agentStatus[agentKey].lastUpdate = Date.now();

          currentStatus = {
            agent: agentKey,
            text: `[${agentStatus[agentKey].name}] ${data.status}`,
            timestamp: Date.now(),
            details: data.description || ''
          };
          broadcast('status', currentStatus);
          broadcast('agent_status', agentStatus);
        }

        broadcast('show', item);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, item }));
        return;
      }

      if (pathname === '/api/status') {
        const agentKey = (data.agent || 'gemini2').toLowerCase();
        if (!agentStatus[agentKey]) {
          agentStatus[agentKey] = { id: agentKey, name: agentKey, status: 'Ativo', details: '', lastUpdate: Date.now() };
        }

        agentStatus[agentKey].status = data.status || 'Em andamento...';
        agentStatus[agentKey].details = data.details || '';
        agentStatus[agentKey].lastUpdate = Date.now();

        currentStatus = {
          agent: agentKey,
          text: `[${agentStatus[agentKey].name}] ${data.status || 'Em andamento...'}`,
          timestamp: Date.now(),
          details: data.details || ''
        };
        broadcast('status', currentStatus);
        broadcast('agent_status', agentStatus);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, currentStatus, agentStatus }));
        return;
      }

      if (pathname === '/api/clear') {
        history = [];
        broadcast('clear', {});
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        return;
      }

      if (pathname === '/api/open-in-explorer') {
        if (data.filePath && fs.existsSync(data.filePath)) {
          exec(`explorer.exe /select,"${data.filePath}"`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'File not found' }));
        }
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    });
    return;
  }

  // File serving for local images
  if (pathname === '/file') {
    const rawPath = parsedUrl.query.path;
    if (!rawPath) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Missing file path');
      return;
    }

    const decodedPath = decodeURIComponent(rawPath);
    if (!fs.existsSync(decodedPath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File not found');
      return;
    }

    try {
      const ext = path.extname(decodedPath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const stat = fs.statSync(decodedPath);
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': stat.size,
        'Cache-Control': 'no-cache'
      });
      const readStream = fs.createReadStream(decodedPath);
      readStream.pipe(res);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Error reading file: ' + err.message);
    }
    return;
  }

  // Static Assets
  let reqPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.join(PUBLIC_DIR, reqPath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

function launchAppWindow() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const urlToOpen = `http://localhost:${PORT}`;

  if (fs.existsSync(edgePath)) {
    const args = [
      `--app=${urlToOpen}`,
      '--window-size=1040,780',
      '--window-position=100,80',
      '--disable-features=Translate',
      '--disable-extensions'
    ];
    spawn(edgePath, args, { detached: true, stdio: 'ignore' }).unref();
  } else {
    exec(`start ${urlToOpen}`);
  }
}

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[Orca Live Preview] Servidor ativo em http://localhost:${PORT}`);
  if (process.argv.includes('--open')) {
    launchAppWindow();
  }
});

module.exports = { server, PORT, broadcast, launchAppWindow, agentStatus };
