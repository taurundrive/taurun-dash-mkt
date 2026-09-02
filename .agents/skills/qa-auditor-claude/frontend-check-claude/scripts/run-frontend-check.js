#!/usr/bin/env node
/**
 * Frontend check — real e2e se existir, fallback honesto (build + smoke
 * test HTTP) se não existir. O campo `coverage` no relatório sempre diz
 * qual dos dois foi usado.
 *
 * // AJUSTE necessário antes de usar de verdade:
 *   - DEV_SERVER_COMMAND / DEV_SERVER_PORT: como o projeto sobe seu dev
 *     server (varia — Nuxt, Next, Vite, CRA, etc.)
 *   - ROUTES_TO_CHECK: rotas reais do projeto pro smoke test HTTP
 *   - BUILD_COMMAND: normalmente "npm run build", mas confirme
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { execSync, spawn } = require('child_process');

const PROJECT_ROOT = process.cwd();
const TMP_DIR = path.join(__dirname, '..', '.tmp');

// AJUSTE: comando e porta reais do dev server do projeto
const DEV_SERVER_COMMAND = process.env.DEV_SERVER_COMMAND || 'npm run dev';
const DEV_SERVER_PORT = parseInt(process.env.DEV_SERVER_PORT || '3000', 10);

// AJUSTE: rotas reais que valem a pena checar no smoke test
const ROUTES_TO_CHECK = (process.env.ROUTES_TO_CHECK || '/').split(',').map((r) => r.trim());

const BUILD_COMMAND = process.env.BUILD_COMMAND || 'npm run build';

const SERVER_READY_TIMEOUT_MS = 30000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Detecção de framework de e2e já configurado
// ---------------------------------------------------------------------------

function detectE2EFramework() {
  const playwrightConfigs = ['playwright.config.ts', 'playwright.config.js', 'playwright.config.mjs'];
  const cypressConfigs = ['cypress.config.ts', 'cypress.config.js', 'cypress.config.mjs'];

  for (const f of playwrightConfigs) {
    if (fs.existsSync(path.join(PROJECT_ROOT, f))) return 'playwright';
  }
  for (const f of cypressConfigs) {
    if (fs.existsSync(path.join(PROJECT_ROOT, f))) return 'cypress';
  }
  if (fs.existsSync(path.join(PROJECT_ROOT, 'cypress'))) return 'cypress';
  return null;
}

// ---------------------------------------------------------------------------
// Método real: rodar a suíte existente
// ---------------------------------------------------------------------------

function runRealE2E(framework) {
  const command = framework === 'playwright' ? 'npx playwright test --reporter=json' : 'npx cypress run --reporter json';

  try {
    const output = execSync(command, { cwd: PROJECT_ROOT, encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 });
    return { success: true, rawOutput: output, exitCode: 0 };
  } catch (err) {
    // Testes que falham fazem o processo sair com código != 0 — isso é
    // esperado e não é um erro de execução do script em si. Capturamos o
    // stdout mesmo assim pra extrair os resultados.
    return {
      success: false,
      rawOutput: (err.stdout || '') + (err.stderr || ''),
      exitCode: err.status ?? null,
      errorMessage: err.message,
    };
  }
}

// ---------------------------------------------------------------------------
// Método fallback: build + smoke test HTTP
// ---------------------------------------------------------------------------

function runBuild() {
  try {
    const output = execSync(BUILD_COMMAND, { cwd: PROJECT_ROOT, encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 });
    return { success: true, output };
  } catch (err) {
    return { success: false, output: (err.stdout || '') + (err.stderr || ''), errorMessage: err.message };
  }
}

function startDevServer() {
  const [cmd, ...cmdArgs] = DEV_SERVER_COMMAND.split(' ');
  const child = spawn(cmd, cmdArgs, { cwd: PROJECT_ROOT, detached: true, stdio: 'ignore' });
  return child;
}

async function waitForServerReady(port, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const isUp = await new Promise((resolve) => {
      const req = http.get({ hostname: 'localhost', port, path: '/', timeout: 1000 }, (res) => {
        res.resume();
        resolve(true);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });
    if (isUp) return true;
    await sleep(500);
  }
  return false;
}

function checkRoute(port, routePath) {
  return new Promise((resolve) => {
    const req = http.get({ hostname: 'localhost', port, path: routePath, timeout: 5000 }, (res) => {
      res.resume();
      resolve({ route: routePath, statusCode: res.statusCode });
    });
    req.on('error', (err) => resolve({ route: routePath, error: err.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ route: routePath, error: 'timeout' });
    });
  });
}

async function runFallbackCheck() {
  const buildResult = runBuild();
  if (!buildResult.success) {
    return {
      coverage: 'best_effort_only',
      buildPassed: false,
      buildOutput: buildResult.output,
      routeResults: [],
      note: 'Build falhou — o frontend não foi verificado além disso. Corrija o erro de build antes de reavaliar.',
    };
  }

  let serverProcess;
  let routeResults = [];
  let serverStarted = false;

  try {
    serverProcess = startDevServer();
    serverStarted = await waitForServerReady(DEV_SERVER_PORT, SERVER_READY_TIMEOUT_MS);

    if (!serverStarted) {
      return {
        coverage: 'best_effort_only',
        buildPassed: true,
        routeResults: [],
        note: `Build passou, mas o dev server não respondeu em localhost:${DEV_SERVER_PORT} dentro de ${SERVER_READY_TIMEOUT_MS}ms. Confira DEV_SERVER_COMMAND/DEV_SERVER_PORT (AJUSTE no topo do script) — pode ser só configuração errada, não um bug real.`,
      };
    }

    for (const route of ROUTES_TO_CHECK) {
      const result = await checkRoute(DEV_SERVER_PORT, route);
      routeResults.push(result);
    }
  } finally {
    if (serverProcess && serverProcess.pid) {
      try {
        process.kill(-serverProcess.pid);
      } catch (e) {
        try { serverProcess.kill(); } catch (e2) { /* ignore */ }
      }
    }
  }

  return {
    coverage: 'best_effort_only',
    buildPassed: true,
    serverStarted,
    routeResults,
    note: 'Isso confirma que o projeto builda e que as rotas respondem via HTTP — NÃO é uma verificação visual ou de interação real. Considere configurar Playwright para cobertura de verdade.',
  };
}

// ---------------------------------------------------------------------------
// Relatório
// ---------------------------------------------------------------------------

function buildReportMarkdown(result) {
  let md = `# Relatório de Frontend Check\n\nGerado em: ${new Date().toISOString()}\n\n`;
  md += `**Cobertura:** \`${result.coverage}\`\n\n`;

  if (result.coverage === 'real_e2e') {
    md += `Framework usado: **${result.framework}**\n\n`;
    md += `Exit code: ${result.exitCode}\n\n`;
    md += "```\n" + (result.rawOutput || '').slice(0, 8000) + "\n```\n\n";
  } else {
    md += `> ⚠️ **Isso NÃO é uma verificação visual/funcional completa.** É só build + smoke test HTTP. ${result.note || ''}\n\n`;
    md += `Build passou: ${result.buildPassed}\n\n`;
    if (result.serverStarted !== undefined) md += `Servidor respondeu: ${result.serverStarted}\n\n`;
    if (result.routeResults && result.routeResults.length) {
      md += `### Rotas checadas\n\n`;
      for (const r of result.routeResults) {
        md += `- \`${r.route}\` → ${r.statusCode ? `status ${r.statusCode}` : `erro: ${r.error}`}\n`;
      }
      md += '\n';
    }
    if (!result.buildPassed && result.buildOutput) {
      md += "### Saída do build\n\n```\n" + result.buildOutput.slice(0, 4000) + "\n```\n";
    }
  }

  return md;
}

async function main() {
  fs.mkdirSync(TMP_DIR, { recursive: true });

  const framework = detectE2EFramework();
  let result;

  if (framework) {
    console.log(`[frontend-check] framework de e2e detectado: ${framework}. Rodando suíte real...`);
    const e2eResult = runRealE2E(framework);
    result = { coverage: 'real_e2e', framework, ...e2eResult };
  } else {
    console.log('[frontend-check] nenhum framework de e2e detectado. Rodando fallback (build + smoke test HTTP)...');
    result = await runFallbackCheck();
  }

  const reportJson = { generatedAt: new Date().toISOString(), ...result };
  const reportMd = buildReportMarkdown(result);

  fs.writeFileSync(path.join(TMP_DIR, 'report.json'), JSON.stringify(reportJson, null, 2));
  fs.writeFileSync(path.join(TMP_DIR, 'report.md'), reportMd);

  console.log(`\n[frontend-check] cobertura: ${result.coverage}`);
  console.log(`[frontend-check] relatório salvo em:`);
  console.log(`  - ${path.join(TMP_DIR, 'report.json')}`);
  console.log(`  - ${path.join(TMP_DIR, 'report.md')}`);
  console.log(`\n[frontend-check] próximo passo: acionar a skill qa-auditor com esse relatório.`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[frontend-check] erro fatal:', err);
    process.exit(1);
  });
}

module.exports = { detectE2EFramework, buildReportMarkdown };
