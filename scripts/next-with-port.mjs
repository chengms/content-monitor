import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const scriptPath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(scriptPath), "..");

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  const env = {};
  const content = readFileSync(filePath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    env[key] = value;
  }

  return env;
}

const localEnv = parseEnvFile(path.join(projectRoot, ".env.local"));
const fallbackEnv = parseEnvFile(path.join(projectRoot, ".env"));
const basePort = Number(process.env.PORT || localEnv.PORT || fallbackEnv.PORT || "4010");

const [, , command, ...args] = process.argv;

if (!command) {
  console.error("Usage: node scripts/next-with-port.mjs <dev|start> [...args]");
  process.exit(1);
}

if (!Number.isInteger(basePort) || basePort <= 0) {
  console.error(`Invalid PORT value: ${basePort}`);
  process.exit(1);
}

function canListen(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();

    server.on("error", () => resolve(false));
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
  });
}

async function findAvailablePort(startPort, attempts = 20) {
  for (let port = startPort; port < startPort + attempts; port += 1) {
    if (await canListen(port)) {
      return port;
    }
  }

  throw new Error(`No available port found between ${startPort} and ${startPort + attempts - 1}`);
}

async function main() {
  const port = await findAvailablePort(basePort);
  const nextBin = require.resolve("next/dist/bin/next");

  if (port !== basePort) {
    console.log(`Port ${basePort} is busy, using ${port} instead.`);
  }

  const child = spawn(process.execPath, [nextBin, command, "-p", String(port), ...args], {
    cwd: projectRoot,
    env: {
      ...process.env,
      PORT: String(port),
    },
    stdio: "inherit",
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
