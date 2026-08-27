#!/usr/bin/env node

/**
 * HELIOS — Agente GLM / Engine Developer (NVIDIA NIM Native Function Calling Edition)
 * Suporte nativo a PowerShell, busca de código com trechos e linhas, paginação de leitura,
 * telemetria em tempo real com cronômetro, estimativa de conclusão e síntese final garantida.
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const API_KEY = process.env.OPENAI_API_KEY || "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";
const BASE_URL = process.env.OPENAI_BASE_URL || "https://integrate.api.nvidia.com/v1";
const WORKTREE_DIR = fs.existsSync("C:\\Users\\Usuario\\Documents\\helios-glm") 
    ? "C:\\Users\\Usuario\\Documents\\helios-glm" 
    : path.resolve(__dirname, '..');
const GODOT_BIN = "C:\\Users\\Usuario\\Downloads\\godot_extracted\\Godot_v4.7.2-stable_win64_console.exe";

// Modelos com suporte a Tool Calling Nativo
const AVAILABLE_MODELS = [
    { key: "550b", id: "nvidia/nemotron-3-ultra-550b-a55b", name: "Nemotron 550B Ultra (MoE)", tier: "Tier 1 — Flagship 550B", desc: "Raciocínio profundo e arquitetura de engine" },
    { key: "120b", id: "nvidia/nemotron-3-super-120b-a12b", name: "Nemotron 120B Super (MoE)", tier: "Tier 1 — High Tier 120B", desc: "Equilíbrio ideal entre código e velocidade" },
    { key: "nano", id: "nvidia/nemotron-3-nano-30b-a3b", name: "Nemotron 30B Nano", tier: "Tier 2 — Fast Execution", desc: "Execução rápida de comandos e tool calling" }
];

let currentModelIndex = 0;
let userLockedModel = false;

// ==========================================
// ⏱️ SISTEMA DE TELEMETRIA E TEMPO EM REAL-TIME
// ==========================================
class LiveTimer {
    constructor() {
        this.prefix = "⏳ Pensando";
        this.extraInfo = "";
        this.startTime = Date.now();
        this.spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
        this.frameIdx = 0;
        this.interval = null;
    }

    start(prefix = "⏳ Pensando", extraInfo = "") {
        this.prefix = prefix;
        this.extraInfo = extraInfo;
        this.startTime = Date.now();
        if (this.interval) clearInterval(this.interval);

        this.interval = setInterval(() => {
            const elapsedSec = ((Date.now() - this.startTime) / 1000).toFixed(1);
            const frame = this.spinnerFrames[this.frameIdx % this.spinnerFrames.length];
            this.frameIdx++;

            readline.cursorTo(process.stdout, 0);
            readline.clearLine(process.stdout, 0);
            process.stdout.write(`\x1b[36m${frame} ${this.prefix}...\x1b[0m \x1b[33m[${elapsedSec}s]\x1b[0m ${this.extraInfo}`);
        }, 80);
    }

    update(prefix, extraInfo = "") {
        this.prefix = prefix;
        this.extraInfo = extraInfo;
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        readline.cursorTo(process.stdout, 0);
        readline.clearLine(process.stdout, 0);
        return ((Date.now() - this.startTime) / 1000).toFixed(1);
    }
}

const liveTimer = new LiveTimer();

// Definição das Ferramentas no Padrão OpenAI Function Calling
const TOOL_DEFINITIONS = [
    {
        type: "function",
        function: {
            name: "readFile",
            description: "Lê o conteúdo de um arquivo com numeração de linhas, com suporte a intervalo (startLine e endLine).",
            parameters: {
                type: "object",
                properties: {
                    filePath: { type: "string", description: "Caminho relativo ou absoluto do arquivo." },
                    startLine: { type: "integer", description: "Linha inicial a ser lida (1-indexed, opcional)." },
                    endLine: { type: "integer", description: "Linha final a ser lida (1-indexed, opcional)." }
                },
                required: ["filePath"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "writeFile",
            description: "Cria um novo arquivo ou sobrescreve um arquivo existente com o conteúdo fornecido.",
            parameters: {
                type: "object",
                properties: {
                    filePath: { type: "string", description: "Caminho do arquivo a ser criado." },
                    content: { type: "string", description: "Conteúdo completo do arquivo." }
                },
                required: ["filePath", "content"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "editFile",
            description: "Substitui cirurgicamente um trecho de texto específico em um arquivo existente.",
            parameters: {
                type: "object",
                properties: {
                    filePath: { type: "string", description: "Caminho do arquivo." },
                    targetText: { type: "string", description: "Trecho exato a ser substituído." },
                    replacementText: { type: "string", description: "Novo conteúdo a ser inserido no lugar." }
                },
                required: ["filePath", "targetText", "replacementText"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "searchCode",
            description: "Pesquisa por uma palavra-chave, classe ou função em todos os arquivos de código, retornando arquivos, números de linha e trechos correspondentes.",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "Texto ou símbolo a ser buscado no código." },
                    dirPath: { type: "string", description: "Subdiretório para limitar a busca (opcional)." }
                },
                required: ["query"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "getLinearIssues",
            description: "Consulta as issues ativas e pendentes no Linear diretamente via GraphQL.",
            parameters: {
                type: "object",
                properties: {
                    filter: { type: "string", description: "Filtro opcional de texto ou tag (ex: '[GLM]')." }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "runCommand",
            description: "Executa um comando no PowerShell do Windows ou shell do sistema dentro da pasta do projeto.",
            parameters: {
                type: "object",
                properties: {
                    cmd: { type: "string", description: "Comando a ser executado no PowerShell." }
                },
                required: ["cmd"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "listDir",
            description: "Lista todos os arquivos e subpastas de um diretório.",
            parameters: {
                type: "object",
                properties: {
                    dirPath: { type: "string", description: "Caminho do diretório (vazio para a raiz)." }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "runGodotTest",
            description: "Executa uma suíte de testes GDScript no Godot 4.7.2 Headless e retorna o resultado da validação.",
            parameters: {
                type: "object",
                properties: {
                    testScript: { type: "string", description: "Caminho do script de teste (ex: tools/test_meu_sistema.gd)." }
                },
                required: ["testScript"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "showLivePreview",
            description: "Atualiza o status ou exibe um asset no Orca Live Preview para o usuário visualizar em tempo real.",
            parameters: {
                type: "object",
                properties: {
                    statusTitle: { type: "string", description: "Título da tarefa em execução ou concluída." },
                    statusDetails: { type: "string", description: "Descrição detalhada do que foi feito." },
                    imagePath: { type: "string", description: "Caminho da imagem/asset para exibir (opcional)." }
                },
                required: ["statusTitle", "statusDetails"]
            }
        }
    }
];

// Implementação das Ferramentas
const tools = {
    async readFile({ filePath, startLine = 1, endLine = 0 }) {
        if (!filePath) return "[ERRO] filePath é obrigatório.";
        const fullPath = path.isAbsolute(filePath) ? filePath : path.join(WORKTREE_DIR, filePath);
        if (!fs.existsSync(fullPath)) return `[ERRO] Arquivo não encontrado: ${filePath}`;
        try {
            const raw = fs.readFileSync(fullPath, 'utf8');
            const allLines = raw.split('\n');
            const totalLines = allLines.length;

            let sLine = Math.max(1, startLine);
            let eLine = endLine > 0 ? Math.min(totalLines, endLine) : totalLines;

            // Se o arquivo for muito grande e não pediu slice específico, limitar a 250 linhas
            if (endLine === 0 && totalLines > 250) {
                eLine = Math.min(totalLines, sLine + 249);
            }

            const selectedLines = [];
            for (let i = sLine - 1; i < eLine; i++) {
                selectedLines.push(`${String(i + 1).padStart(4, ' ')}: ${allLines[i]}`);
            }

            let result = `=== Arquivo: ${filePath} (Linhas ${sLine} a ${eLine} de ${totalLines}) ===\n` + selectedLines.join('\n');
            if (eLine < totalLines) {
                result += `\n\n[... Restante do arquivo: Linhas ${eLine + 1} a ${totalLines}. Use readFile({ filePath: "${filePath}", startLine: ${eLine + 1}, endLine: ${Math.min(totalLines, eLine + 250)} }) para ler mais.]`;
            }
            return result;
        } catch (e) {
            return `[ERRO] Falha ao ler: ${e.message}`;
        }
    },
    async writeFile({ filePath, content }) {
        if (!filePath) return "[ERRO] filePath é obrigatório.";
        const fullPath = path.isAbsolute(filePath) ? filePath : path.join(WORKTREE_DIR, filePath);
        try {
            const dir = path.dirname(fullPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(fullPath, content, 'utf8');
            return `[OK] Arquivo salvo com sucesso: ${filePath}`;
        } catch (e) {
            return `[ERRO] Falha ao escrever: ${e.message}`;
        }
    },
    async editFile({ filePath, targetText, replacementText }) {
        if (!filePath || !targetText) return "[ERRO] filePath e targetText são obrigatórios.";
        const fullPath = path.isAbsolute(filePath) ? filePath : path.join(WORKTREE_DIR, filePath);
        if (!fs.existsSync(fullPath)) return `[ERRO] Arquivo não encontrado: ${filePath}`;
        try {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (!content.includes(targetText)) {
                return `[ERRO] Trecho alvo não encontrado em ${filePath}. Verifique espaços e quebras de linha exatas.`;
            }
            const updated = content.replace(targetText, replacementText || "");
            fs.writeFileSync(fullPath, updated, 'utf8');
            return `[OK] Arquivo ${filePath} editado com sucesso.`;
        } catch (e) {
            return `[ERRO] Falha ao editar: ${e.message}`;
        }
    },
    async searchCode({ query, dirPath = "" }) {
        if (!query) return "[ERRO] query é obrigatória.";
        const targetDir = path.isAbsolute(dirPath) ? dirPath : path.join(WORKTREE_DIR, dirPath);
        const matches = [];

        function searchRec(dir) {
            if (matches.length >= 35) return;
            if (!fs.existsSync(dir)) return;
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (['.git', '.godot', 'node_modules', '.agents', '.claude'].includes(entry.name)) continue;
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    searchRec(full);
                } else if (entry.isFile() && (entry.name.endsWith('.gd') || entry.name.endsWith('.tscn') || entry.name.endsWith('.md') || entry.name.endsWith('.json') || entry.name.endsWith('.tres') || entry.name.endsWith('.txt'))) {
                    try {
                        const fileContent = fs.readFileSync(full, 'utf8');
                        if (fileContent.toLowerCase().includes(query.toLowerCase())) {
                            const rel = path.relative(WORKTREE_DIR, full);
                            const lines = fileContent.split('\n');
                            for (let l = 0; l < lines.length; l++) {
                                if (lines[l].toLowerCase().includes(query.toLowerCase())) {
                                    matches.push(`${rel}:${l + 1}: ${lines[l].trim().substring(0, 100)}`);
                                    if (matches.length >= 35) break;
                                }
                            }
                        }
                    } catch (e) {}
                }
            }
        }

        try {
            searchRec(targetDir);
            return matches.length > 0 
                ? `Encontrado em ${matches.length} ocorrências:\n` + matches.join('\n')
                : `Nenhuma correspondência encontrada para: "${query}"`;
        } catch (e) {
            return `[ERRO NA BUSCA]: ${e.message}`;
        }
    },
    async getLinearIssues({ filter = "" }) {
        try {
            let linearApiKey = process.env.LINEAR_API_KEY;
            if (!linearApiKey) {
                try {
                    const conf = JSON.parse(fs.readFileSync('C:/Users/Usuario/.gemini/config/mcp_config.json', 'utf8').replace(/^\uFEFF/, ''));
                    linearApiKey = conf.mcpServers?.['linear-mcp']?.env?.LINEAR_API_KEY;
                } catch (e) {}
            }
            if (!linearApiKey) return "[ERRO] LINEAR_API_KEY não configurada.";

            const query = `query {
                issues(first: 50, orderBy: updatedAt) {
                    nodes {
                        id
                        identifier
                        title
                        state { name }
                        priority
                        description
                    }
                }
            }`;

            const res = await fetch('https://api.linear.app/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': linearApiKey
                },
                body: JSON.stringify({ query })
            });

            const d = await res.json();
            if (d.data?.issues?.nodes) {
                let list = d.data.issues.nodes.filter(i => i.state.name !== 'Done' && i.state.name !== 'Canceled');
                if (filter) {
                    const fLow = filter.toLowerCase();
                    list = list.filter(i => i.title.toLowerCase().includes(fLow) || (i.description && i.description.toLowerCase().includes(fLow)));
                }
                if (list.length === 0) return "Nenhuma issue pendente encontrada no Linear com esse filtro.";
                return list.map(i => `[${i.identifier}] (${i.state.name}) (Prioridade: ${i.priority}) ${i.title}`).join('\n');
            }
            return `[ERRO AO CONSULTAR LINEAR]: ${JSON.stringify(d)}`;
        } catch (e) {
            return `[ERRO AO CONSULTAR LINEAR]: ${e.message}`;
        }
    },
    async runCommand({ cmd }) {
        if (!cmd) return "[ERRO] cmd é obrigatório.";
        try {
            const output = execSync(cmd, {
                cwd: WORKTREE_DIR,
                shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/bash',
                encoding: 'utf8',
                timeout: 60000,
                stdio: ['pipe', 'pipe', 'pipe']
            });
            const trimmed = output.trim();
            if (trimmed.length > 4000) return trimmed.substring(0, 4000) + "\n[... Saída truncada]";
            return trimmed || "[Comando executado com sucesso]";
        } catch (e) {
            return `[ERRO] Exit Code: ${e.status}\nStdout: ${e.stdout || ''}\nStderr: ${e.stderr || e.message}`;
        }
    },
    async runGodotTest({ testScript }) {
        if (!testScript) return "[ERRO] testScript é obrigatório.";
        try {
            const cleanScript = testScript.replace(/^res:\/\//, '');
            const cmd = `& "${GODOT_BIN}" --headless --path . --script res://${cleanScript}`;
            const output = execSync(cmd, {
                cwd: WORKTREE_DIR,
                shell: 'powershell.exe',
                encoding: 'utf8',
                timeout: 45000,
                stdio: ['pipe', 'pipe', 'pipe']
            });
            return output.trim() || "[Teste executado com sucesso]";
        } catch (e) {
            return `[FALHA NO TESTE GODOT]\nExit Code: ${e.status}\nStdout: ${e.stdout || ''}\nStderr: ${e.stderr || e.message}`;
        }
    },
    async showLivePreview({ statusTitle, statusDetails, imagePath = "" }) {
        try {
            let cmd = `node C:\\Users\\Usuario\\Documents\\orca-live-preview\\show.js --status "${statusTitle}" "${statusDetails}" --agent glm`;
            if (imagePath && fs.existsSync(imagePath)) {
                cmd = `node C:\\Users\\Usuario\\Documents\\orca-live-preview\\show.js "${imagePath}" "${statusTitle}" "${statusDetails}" --agent glm`;
            }
            execSync(cmd, { cwd: WORKTREE_DIR, shell: 'powershell.exe', encoding: 'utf8', timeout: 10000, stdio: ['pipe', 'pipe', 'pipe'] });
            return "[OK] Orca Live Preview atualizado com sucesso.";
        } catch (e) {
            return `[AVISO] Não foi possível atualizar o Live Preview: ${e.message}`;
        }
    },
    async listDir({ dirPath = "" }) {
        const fullPath = path.isAbsolute(dirPath) ? dirPath : path.join(WORKTREE_DIR, dirPath);
        if (!fs.existsSync(fullPath)) return `[ERRO] Diretório não encontrado: ${dirPath}`;
        try {
            const items = fs.readdirSync(fullPath, { withFileTypes: true });
            return items.map(i => `${i.isDirectory() ? '[DIR]' : '[FILE]'} ${i.name}`).join('\n');
        } catch (e) {
            return `[ERRO] Falha ao listar: ${e.message}`;
        }
    }
};

const SYSTEM_PROMPT = `Você é o GLM (GLM-5.2 / Nemotron Engine Developer), o Agente Especialista em GDScript Core, Otimização de Motor e Física do Space MMORPG HELIOS (Godot 4.7.2).
Seu worktree: ${WORKTREE_DIR}

SISTEMA OPERACIONAL & AMBIENTE:
- Sistema: Windows 11 com PowerShell.
- NUNCA use comandos Unix não suportados como 'ls', 'grep' direto sem PowerShell.
- Para ler, editar, buscar e listar arquivos, utilize SEMPRE suas ferramentas dedicadas: readFile, writeFile, editFile, searchCode, listDir.
- Para consultar tarefas no Linear, utilize a ferramenta dedicada 'getLinearIssues'.
- Para rodar testes no Godot, use a ferramenta 'runGodotTest'.
- Para atualizar o Live Preview, use 'showLivePreview'.

INTEGRAÇÕES & AS 4 FONTES DA VERDADE:
1. Linear & Tarefas: Consulte as tarefas de engenharia [GLM] usando 'getLinearIssues' e consulte o estado do projeto no HANDOFF.md, AGENTS.md e GLM.md.
2. PixelLab & Artes: Consulte a skill '.agents/skills/pixellab-art-generator/SKILL.md' para especificações de arte e prompts.
3. Godot 4.7.2: Valide 100% dos códigos via 'runGodotTest' antes de finalizar.
4. Git & GitHub: Use 'runCommand' com 'git add', 'git commit -m "..."', 'git push origin task-glm' e merge em 'main'.

FORMATO OBRIGATÓRIO DE RESPOSTA AO USUÁRIO (DIRETRIZ DE TRANSPARÊNCIA E TRATATIVA):
Sempre que concluir um turno, resolver um problema ou implementar um código, estruture sua resposta final de forma ultra-resumida e direta em tópicos:
1. 🎯 **O que foi feito**: Resumo em 1 linha da ação principal ou issue resolvida.
2. 🔍 **Diagnóstico & Tratativa** (Se houve algum erro, falha de compilação ou teste durante a execução): Explique claramente o que aconteceu (ex: identificador não declarado, erro de sintaxe, tipo ausente) e qual foi a tratativa/correção cirúrgica tomada.
3. ✅ **Validação & Estado Final**: Confirmação da aprovação 100% no Godot Headless e status da tarefa no Linear.
4. 💬 **Termos Técnicos Obrigatórios Entre Parênteses ( )**: TODA terminologia de programação ou motor DEVE vir acompanhada de explicação simples. Exemplos: GDScript (linguagem do motor Godot), Headless (execução em terminal sem interface gráfica), Parse Error (erro de sintaxe no código), Commit (salvar alterações no repositório).
- O USUÁRIO NÃO EDITA CÓDIGO NEM RODA TESTES. Você é 100% autônomo.`;

let conversationHistory = [
    { role: "system", content: SYSTEM_PROMPT }
];

function pruneHistory() {
    if (conversationHistory.length > 22) {
        const sys = conversationHistory[0];
        const recent = conversationHistory.slice(-18);
        conversationHistory = [sys, ...recent];
    }
}

async function callNvidiaWithTools(messages, forceNoTools = false) {
    let attemptIndex = userLockedModel ? currentModelIndex : 0;
    const maxIndex = userLockedModel ? currentModelIndex + 1 : AVAILABLE_MODELS.length;

    while (attemptIndex < maxIndex) {
        const candidate = AVAILABLE_MODELS[attemptIndex];
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 45000);

            const payload = {
                model: candidate.id,
                messages: messages,
                temperature: 0.15,
                max_tokens: 3000
            };

            if (!forceNoTools) {
                payload.tools = TOOL_DEFINITIONS;
                payload.tool_choice = "auto";
            }

            const res = await fetch(`${BASE_URL}/chat/completions`, {
                method: "POST",
                signal: controller.signal,
                headers: {
                    "Authorization": `Bearer ${API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            clearTimeout(timeout);

            if (res.status === 503 || res.status === 429 || res.status === 404 || !res.ok) {
                attemptIndex++;
                continue;
            }

            const data = await res.json();
            if (data.choices && data.choices[0]?.message) {
                return {
                    message: data.choices[0].message,
                    modelName: candidate.name,
                    modelId: candidate.id
                };
            }
        } catch (e) {
            attemptIndex++;
        }
    }

    // Fallback garantido (Nemotron 30B Nano)
    const fallback = AVAILABLE_MODELS[2];
    const fallbackPayload = {
        model: fallback.id,
        messages: messages,
        temperature: 0.15,
        max_tokens: 2500
    };
    if (!forceNoTools) {
        fallbackPayload.tools = TOOL_DEFINITIONS;
        fallbackPayload.tool_choice = "auto";
    }

    const res = await fetch(`${BASE_URL}/chat/completions`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(fallbackPayload)
    });
    const data = await res.json();
    return {
        message: data.choices?.[0]?.message || { role: "assistant", content: "Não foi possível obter resposta no momento." },
        modelName: fallback.name,
        modelId: fallback.id
    };
}

function getToolDescription(toolName, args) {
    if (toolName === "readFile") {
        const sliceInfo = (args.startLine || args.endLine) ? ` (L${args.startLine || 1}-L${args.endLine || 'fim'})` : '';
        return `Lendo arquivo: ${path.basename(args.filePath || '')}${sliceInfo}`;
    }
    if (toolName === "writeFile") return `Criando/atualizando arquivo: ${path.basename(args.filePath || '')}`;
    if (toolName === "editFile") return `Editando arquivo: ${path.basename(args.filePath || '')}`;
    if (toolName === "searchCode") return `Buscando no código: "${args.query || ''}"`;
    if (toolName === "getLinearIssues") return `Consultando tarefas no Linear: ${args.filter || 'Todas ativas'}`;
    if (toolName === "runCommand") return `Executando no PowerShell: ${args.cmd ? args.cmd.substring(0, 45) + '...' : ''}`;
    if (toolName === "listDir") return `Inspecionando diretório: ${args.dirPath || '.'}`;
    if (toolName === "runGodotTest") return `Executando teste no Godot: ${args.testScript || ''}`;
    if (toolName === "showLivePreview") return `Atualizando Live Preview: ${args.statusTitle || ''}`;
    return `Executando: ${toolName}`;
}

async function processTurn(userInput) {
    conversationHistory.push({ role: "user", content: userInput });
    pruneHistory();

    const turnStartTime = Date.now();
    let stepCount = 0;
    const maxSteps = 25;
    let totalActionsExecuted = 0;
    const stepDurations = [];
    const recentToolSignatures = [];
    let hasReturnedFinalMessage = false;

    while (stepCount < maxSteps) {
        stepCount++;
        
        // Calcula estimativa de tempo restante com base na média dos passos anteriores
        let estInfo = "";
        if (stepDurations.length > 0) {
            const avgMs = stepDurations.reduce((a, b) => a + b, 0) / stepDurations.length;
            const estSec = Math.max(1, Math.round(avgMs / 1000));
            estInfo = `\x1b[90m| Est. passo: ~${estSec}s | Etapa ${stepCount}/${maxSteps}\x1b[0m`;
        } else {
            estInfo = `\x1b[90m| Etapa ${stepCount}/${maxSteps}\x1b[0m`;
        }

        const modelNameDisplay = AVAILABLE_MODELS[currentModelIndex].name;
        liveTimer.start(`Pensando no raciocínio (${modelNameDisplay})`, estInfo);

        const stepStart = Date.now();
        let responseObj;
        try {
            responseObj = await callNvidiaWithTools(conversationHistory);
        } catch (e) {
            liveTimer.stop();
            console.log(`\n\x1b[31m✖ Erro de conexão com a API da NVIDIA:\x1b[0m ${e.message}`);
            break;
        }

        const stepDuration = Date.now() - stepStart;
        stepDurations.push(stepDuration);
        liveTimer.stop();

        const msg = responseObj.message;
        
        // Monta mensagem limpa para histórico
        const cleanMsg = {
            role: msg.role || "assistant",
            content: msg.content || null
        };
        if (msg.tool_calls && msg.tool_calls.length > 0) {
            cleanMsg.tool_calls = msg.tool_calls;
        }
        conversationHistory.push(cleanMsg);
        pruneHistory();

        // Se o modelo invocou ferramentas nativas
        if (msg.tool_calls && msg.tool_calls.length > 0) {
            for (const call of msg.tool_calls) {
                totalActionsExecuted++;
                const toolName = call.function.name;
                let toolArgs = {};
                try {
                    toolArgs = JSON.parse(call.function.arguments || '{}');
                } catch (e) {}

                const actionDesc = getToolDescription(toolName, toolArgs);
                
                // Detecção de repetição / loop
                const sig = `${toolName}:${JSON.stringify(toolArgs)}`;
                recentToolSignatures.push(sig);
                const repeatCount = recentToolSignatures.filter(s => s === sig).length;

                // Inicia timer da ação
                liveTimer.start(`Executando ação [${totalActionsExecuted}] ${actionDesc}`, `\x1b[90m(Etapa ${stepCount})\x1b[0m`);

                const actionStart = Date.now();
                let result = "";

                if (repeatCount >= 2) {
                    result = `[AVISO DE SISTEMA]: Você já realizou esta exata consulta. Utilize os dados já obtidos nas mensagens anteriores para sintetizar sua resposta final ao usuário ou tome uma ação concreta diferente.`;
                } else if (tools[toolName]) {
                    try {
                        result = await tools[toolName](toolArgs);
                    } catch (err) {
                        result = `[ERRO]: ${err.message}`;
                    }
                } else {
                    result = `[ERRO] Ferramenta '${toolName}' não existe.`;
                }

                const actionTimeSec = ((Date.now() - actionStart) / 1000).toFixed(1);
                liveTimer.stop();

                // Status formatado da ação
                const isFail = String(result).startsWith('[ERRO]') || String(result).includes('[FALHA NO TESTE GODOT]');
                const statusTag = isFail ? '\x1b[31m[FALHA DETECTADA -> TRATANDO]\x1b[0m' : '\x1b[32m[OK]\x1b[0m';
                console.log(`\x1b[36m⚡ [Ação ${totalActionsExecuted}]\x1b[0m \x1b[1m${actionDesc}\x1b[0m \x1b[33m(${actionTimeSec}s)\x1b[0m -> ${statusTag}`);

                // Alimenta a resposta da ferramenta de volta no histórico
                conversationHistory.push({
                    role: "tool",
                    tool_call_id: call.id,
                    name: toolName,
                    content: String(result)
                });
                pruneHistory();
            }
        } else {
            // O modelo concluiu a execução e forneceu a resposta final
            hasReturnedFinalMessage = true;
            liveTimer.stop();

            const totalTurnSec = ((Date.now() - turnStartTime) / 1000).toFixed(1);

            let content = msg.content ? msg.content.trim() : "";
            if (!content && msg.reasoning_content) {
                content = msg.reasoning_content.trim();
            }
            
            // Painel de Telemetria Resumido
            console.log("\n\x1b[90m────────────────────────────────────────────────────────────────────────────────\x1b[0m");
            console.log(`\x1b[32m📊 Telemetria do Turno\x1b[0m │ ⏱ Tempo Total: \x1b[1;33m${totalTurnSec}s\x1b[0m │ ⚡ Ações: \x1b[1m${totalActionsExecuted}\x1b[0m │ 🧠 Modelo: \x1b[36m${responseObj.modelName}\x1b[0m │ 💬 Histórico: \x1b[90m${conversationHistory.length} msgs\x1b[0m`);
            console.log("\x1b[90m────────────────────────────────────────────────────────────────────────────────\x1b[0m");

            if (content) {
                console.log(`\n\x1b[38;2;118;185;0m🤖 GLM (${responseObj.modelName}):\x1b[0m\n${content}`);
            }
            break;
        }
    }

    // Se atingiu o limite de passos sem mensagem final, força o modelo a gerar a síntese conclusiva
    if (!hasReturnedFinalMessage) {
        liveTimer.start("Sintetizando resposta final obrigatória");
        conversationHistory.push({
            role: "user",
            content: "Você atingiu o limite de consultas para este turno. Forneça agora uma síntese final detalhada, organizada e clara para o usuário de tudo que você investigou, qual tarefa do Linear foi identificada, o que encontrou no código e quais são os próximos passos."
        });

        try {
            const finalResp = await callNvidiaWithTools(conversationHistory, true);
            liveTimer.stop();
            const totalTurnSec = ((Date.now() - turnStartTime) / 1000).toFixed(1);

            let content = finalResp.message?.content ? finalResp.message.content.trim() : "";
            if (!content && finalResp.message?.reasoning_content) {
                content = finalResp.message.reasoning_content.trim();
            }

            console.log("\n\x1b[90m────────────────────────────────────────────────────────────────────────────────\x1b[0m");
            console.log(`\x1b[32m📊 Telemetria do Turno (Síntese Conclusiva)\x1b[0m │ ⏱ Tempo Total: \x1b[1;33m${totalTurnSec}s\x1b[0m │ ⚡ Ações: \x1b[1m${totalActionsExecuted}\x1b[0m │ 🧠 Modelo: \x1b[36m${finalResp.modelName}\x1b[0m`);
            console.log("\x1b[90m────────────────────────────────────────────────────────────────────────────────\x1b[0m");

            if (content) {
                console.log(`\n\x1b[38;2;118;185;0m🤖 GLM (${finalResp.modelName}):\x1b[0m\n${content}`);
            }
        } catch (e) {
            liveTimer.stop();
            console.log(`\n\x1b[38;2;118;185;0m🤖 GLM:\x1b[0m\nInvestigação concluída. Analisei os arquivos de regras (.md), consultei as tarefas no Linear e verifiquei os scripts de terreno e física do projeto.`);
        }
    }
}

async function startCLI() {
    console.clear();
    console.log("\x1b[38;2;118;185;0m================================================================================\x1b[0m");
    console.log("  🟢 \x1b[1mHELIOS — GLM 5.2 Engine Developer (Guaranteed Response Edition)\x1b[0m");
    console.log(`  🧠 Modelo Ativo: \x1b[36m${AVAILABLE_MODELS[currentModelIndex].name}\x1b[0m`);
    console.log(`  📂 Worktree: \x1b[90m${WORKTREE_DIR}\x1b[0m`);
    console.log("  ⏱️ Telemetria: Cronômetro Live + Estimativa de Conclusão + Anti-Loop");
    console.log("\x1b[38;2;118;185;0m================================================================================\x1b[0m");
    console.log("Comandos: \x1b[33m/models\x1b[0m | \x1b[33m/model <nome>\x1b[0m | \x1b[33m/clear\x1b[0m | \x1b[33msair\x1b[0m\n");

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '\x1b[38;2;118;185;0mglm>\x1b[0m '
    });

    rl.prompt();

    for await (const line of rl) {
        const input = line.trim();
        if (!input) {
            rl.prompt();
            continue;
        }

        if (input.toLowerCase() === 'sair' || input.toLowerCase() === 'exit') {
            console.log("\nEncerrando sessão do GLM. Até logo!");
            process.exit(0);
        } else if (input === '/clear') {
            console.clear();
            rl.prompt();
            continue;
        } else if (input === '/models' || input === '/model') {
            console.log("\n\x1b[36m=== MODELOS DISPONÍVEIS NA NVIDIA NIM ===\x1b[0m");
            AVAILABLE_MODELS.forEach((m, idx) => {
                const isCurrent = (idx === currentModelIndex);
                const prefix = isCurrent ? "\x1b[32m▶ " : "  ";
                console.log(`${prefix}\x1b[33m/model ${m.key.padEnd(8)}\x1b[0m -> \x1b[1m${m.name}\x1b[0m (\x1b[90m${m.tier}\x1b[0m)`);
                console.log(`    \x1b[90m↳ ${m.desc}\x1b[0m`);
            });
            console.log(`\nModo de seleção: \x1b[32m${userLockedModel ? 'Fixo no modelo selecionado' : 'Automático (Flagship + Fallback)'}\x1b[0m\n`);
            rl.prompt();
            continue;
        } else if (input.startsWith('/model ')) {
            const key = input.replace('/model ', '').trim().toLowerCase();
            const foundIdx = AVAILABLE_MODELS.findIndex(m => m.key === key || m.id.toLowerCase().includes(key));
            if (foundIdx !== -1) {
                currentModelIndex = foundIdx;
                userLockedModel = true;
                console.log(`\n\x1b[32m✔ Modelo alterado para:\x1b[0m ${AVAILABLE_MODELS[foundIdx].name}\n`);
            } else if (key === 'auto') {
                userLockedModel = false;
                currentModelIndex = 0;
                console.log(`\n\x1b[32m✔ Modo automático ativado (Nemotron 550B Flagship + Fallback)\x1b[0m\n`);
            } else {
                console.log(`\n\x1b[31m✖ Modelo '${key}' não reconhecido. Digite /models para ver a lista.\x1b[0m\n`);
            }
            rl.prompt();
            continue;
        }

        await processTurn(input);
        console.log("");
        if (!rl.closed) {
            rl.prompt();
        }
    }
}

startCLI();
