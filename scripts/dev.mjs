import { execSync } from "node:child_process";

const PORTS = [3000, 3001];

function getListeningPidsOnWindows(port) {
  const output = execSync(`netstat -ano -p tcp | findstr :${port}`, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => /\bLISTENING\b/i.test(line))
    .map((line) => {
      const parts = line.split(/\s+/);
      return Number(parts[parts.length - 1]);
    })
    .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid);
}

function getListeningPidsOnUnix(port) {
  const output = execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });

  return output
    .split(/\r?\n/)
    .map((line) => Number(line.trim()))
    .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid);
}

function getListeningPids(port) {
  try {
    return process.platform === "win32"
      ? getListeningPidsOnWindows(port)
      : getListeningPidsOnUnix(port);
  } catch {
    return [];
  }
}

function killPid(pid) {
  if (process.platform === "win32") {
    execSync(`taskkill /PID ${pid} /F`, {
      stdio: ["ignore", "ignore", "ignore"],
    });
    return;
  }

  process.kill(pid, "SIGTERM");
}

for (const port of PORTS) {
  const pids = [...new Set(getListeningPids(port))];
  for (const pid of pids) {
    try {
      console.log(`Freeing port ${port} by stopping PID ${pid}`);
      killPid(pid);
    } catch (error) {
      console.warn(`Failed to stop PID ${pid} on port ${port}:`, error instanceof Error ? error.message : String(error));
    }
  }
}

execSync("pnpm exec turbo run dev", {
  stdio: "inherit",
  shell: true,
});
