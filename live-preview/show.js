const http = require('http');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');

const PORT = process.env.PORT || 54321;

function detectAgentFromCwd() {
  const cwd = process.cwd().toLowerCase();
  if (cwd.includes('gemini1')) return 'gemini1';
  if (cwd.includes('gemini2')) return 'gemini2';
  if (cwd.includes('gemini3')) return 'gemini3';
  if (cwd.includes('gemini4')) return 'gemini4';
  if (cwd.includes('claude')) return 'claude';
  if (cwd.includes('glm')) return 'glm';
  return 'gemini2';
}

async function isServerRunning() {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${PORT}/events`, { timeout: 800 }, (res) => {
      req.destroy();
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

function focusWindow() {
  const focusScript = path.join(__dirname, 'focus.ps1');
  if (fs.existsSync(focusScript)) {
    exec(`powershell -ExecutionPolicy Bypass -File "${focusScript}"`, (err) => {
      if (err) {
        // Fallback: direct Edge app launch
        const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
        if (fs.existsSync(edgePath)) {
          spawn(edgePath, [`--app=http://localhost:${PORT}`], { detached: true, stdio: 'ignore' }).unref();
        }
      }
    });
  }
}

function startServerInBackground() {
  const serverPath = path.join(__dirname, 'server.js');
  const child = spawn(process.execPath, [serverPath, '--open'], {
    detached: true,
    stdio: 'ignore',
    windowsHide: false
  });
  child.unref();
}

function sendPost(endpoint, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const req = http.request({
      hostname: '127.0.0.1',
      port: PORT,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let responseBody = '';
      res.on('data', chunk => { responseBody += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseBody));
        } catch (e) {
          resolve({ success: true });
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(postData);
    req.end();
  });
}

async function main() {
  const rawArgs = process.argv.slice(2);
  let agent = detectAgentFromCwd();
  const args = [];

  for (let i = 0; i < rawArgs.length; i++) {
    if (rawArgs[i] === '--agent' && rawArgs[i + 1]) {
      agent = rawArgs[i + 1].toLowerCase();
      i++;
    } else {
      args.push(rawArgs[i]);
    }
  }

  if (args.length === 0) {
    console.log('Uso:');
    console.log('  node show.js <caminho_da_imagem> [titulo] [descricao] [--agent gemini1|gemini2|claude]');
    console.log('  node show.js --status "Trabalhando em..." "detalhes" [--agent gemini1|gemini2|claude]');
    console.log('  node show.js --open');
    return;
  }

  let running = await isServerRunning();
  if (!running) {
    console.log('[Live Preview] Iniciando servidor e abrindo janela...');
    startServerInBackground();
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 200));
      if (await isServerRunning()) {
        running = true;
        break;
      }
    }
  }

  if (args[0] === '--open') {
    focusWindow();
    console.log('[Live Preview] Janela aberta e trazida para frente.');
    return;
  }

  if (args[0] === '--status') {
    const statusText = args[1] || 'Em progresso';
    const details = args[2] || '';
    await sendPost('/api/status', { agent, status: statusText, details });
    console.log(`[Live Preview] Status atualizado (${agent}): ${statusText}`);
    return;
  }

  // Show image
  const inputPath = args[0];
  const title = args[1] || path.basename(inputPath);
  const description = args[2] || '';
  const status = args[3] || `Exibindo ${title}`;

  let resolvedPath = inputPath;
  if (!inputPath.startsWith('http://') && !inputPath.startsWith('https://') && !inputPath.startsWith('data:')) {
    resolvedPath = path.resolve(process.cwd(), inputPath);
  }

  try {
    await sendPost('/api/show', {
      agent: agent,
      filePath: resolvedPath,
      title: title,
      description: description,
      status: status
    });
    focusWindow();
    console.log(`[Live Preview] Imagem enviada com sucesso (${agent}): ${title}`);
  } catch (err) {
    console.error('[Live Preview] Erro ao enviar imagem:', err.message);
  }
}

main();
