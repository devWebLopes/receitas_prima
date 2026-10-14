// Script multiplataforma para subir o ambiente local de desenvolvimento (Windows, Linux, macOS)
// Inicia a API (porta 5000) e o Frontend Vite (porta 5173) simultaneamente.
import { spawn, execSync } from "node:child_process";
import { existsSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const envFile = path.resolve(rootDir, ".env");
const envExample = path.resolve(rootDir, ".env.example");

// 1. Garante que o arquivo .env existe localmente
if (!existsSync(envFile) && existsSync(envExample)) {
  console.log("⚡ [setup] Arquivo .env não encontrado. Criando a partir de .env.example...");
  copyFileSync(envExample, envFile);
  console.log("⚡ [setup] .env criado. Certifique-se de que o PostgreSQL está rodando em DATABASE_URL.");
}

console.log("\n============================================================");
console.log("🍞 MIOLO — Custos de Alimentos (Ambiente de Desenvolvimento)");
console.log("============================================================");
console.log("➜ Frontend: http://localhost:5173");
console.log("➜ API:      http://localhost:5000/api");
console.log("➜ Pressione Ctrl+C para encerrar todos os serviços.\n");

const isWin = process.platform === "win32";
const pnpmCmd = isWin ? "pnpm.cmd" : "pnpm";

function startProcess(name, args, color) {
  const child = isWin
    ? spawn(`"${pnpmCmd}" ${args.join(" ")}`, {
        cwd: rootDir,
        stdio: ["inherit", "pipe", "pipe"],
        shell: true,
      })
    : spawn(pnpmCmd, args, {
        cwd: rootDir,
        stdio: ["inherit", "pipe", "pipe"],
      });

  const prefix = `\x1b[${color}m[${name}]\x1b[0m `;

  child.stdout.on("data", (data) => {
    const lines = data.toString().split("\n");
    for (const line of lines) {
      if (line.trim().length > 0) {
        console.log(`${prefix}${line}`);
      }
    }
  });

  child.stderr.on("data", (data) => {
    const lines = data.toString().split("\n");
    for (const line of lines) {
      if (line.trim().length > 0) {
        console.error(`${prefix}\x1b[31m${line}\x1b[0m`);
      }
    }
  });

  return child;
}

// Cores ANSI: 36 (Cyan para API), 35 (Magenta para Web)
const apiProcess = startProcess("api", ["--filter", "@workspace/api-server", "run", "dev"], "36");
const webProcess = startProcess("web", ["--filter", "@workspace/custos-alimentos", "run", "dev"], "35");

function cleanup() {
  console.log("\n🛑 Encerrando serviços...");
  if (isWin) {
    if (apiProcess.pid) {
      try { execSync(`taskkill /pid ${apiProcess.pid} /t /f`, { stdio: "ignore" }); } catch {}
    }
    if (webProcess.pid) {
      try { execSync(`taskkill /pid ${webProcess.pid} /t /f`, { stdio: "ignore" }); } catch {}
    }
  } else {
    apiProcess.kill("SIGTERM");
    webProcess.kill("SIGTERM");
  }
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", cleanup);
