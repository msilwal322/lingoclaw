#!/usr/bin/env node
const { execFileSync } = require('node:child_process');

const repoRoot = '/home/azureuser/lingoclaw';
const target = process.argv[2] ?? 'all';

const patternsByTarget = {
  backend: [
    `${repoRoot}/backend/node_modules/.bin/nest start --watch`,
    `${repoRoot}/backend/dist/main`,
  ],
  frontend: [
    `${repoRoot}/frontend/node_modules/.bin/next`,
    `${repoRoot}/frontend/.next/`,
  ],
  all: [
    `${repoRoot}/frontend/node_modules/.bin/next`,
    `${repoRoot}/backend/node_modules/.bin/nest start --watch`,
    `${repoRoot}/backend/dist/main`,
    `${repoRoot}/frontend/.next/`,
  ],
};

if (!patternsByTarget[target]) {
  console.error(`Unknown target: ${target}. Use one of: backend, frontend, all`);
  process.exit(1);
}

function listMatchingPids(patterns) {
  const pidSet = new Set();

  for (const pattern of patterns) {
    try {
      const output = execFileSync('pgrep', ['-f', pattern], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();

      for (const line of output.split('\n')) {
        const pid = Number.parseInt(line.trim(), 10);
        if (Number.isInteger(pid) && pid !== process.pid) {
          pidSet.add(pid);
        }
      }
    } catch (error) {
      if (error.status !== 1) {
        throw error;
      }
    }
  }

  return [...pidSet];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function stopTarget(name, patterns) {
  const pids = listMatchingPids(patterns);

  if (pids.length === 0) {
    console.log(`No LingoClaw ${name} dev processes found.`);
    return;
  }

  console.log(`Stopping LingoClaw ${name} processes: ${pids.join(', ')}`);

  for (const pid of pids) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch (error) {
      if (error.code !== 'ESRCH') {
        throw error;
      }
    }
  }

  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    const remaining = listMatchingPids(patterns);
    if (remaining.length === 0) {
      console.log(`All LingoClaw ${name} dev processes stopped.`);
      return;
    }
    await sleep(250);
  }

  const remaining = listMatchingPids(patterns);
  if (remaining.length === 0) {
    console.log(`All LingoClaw ${name} dev processes stopped.`);
    return;
  }

  console.log(`Escalating to SIGKILL for stubborn ${name} processes: ${remaining.join(', ')}`);
  for (const pid of remaining) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch (error) {
      if (error.code !== 'ESRCH') {
        throw error;
      }
    }
  }

  const finalRemaining = listMatchingPids(patterns);
  if (finalRemaining.length > 0) {
    console.error(`Failed to stop ${name} processes: ${finalRemaining.join(', ')}`);
    process.exit(1);
  }

  console.log(`All LingoClaw ${name} dev processes stopped.`);
}

stopTarget(target, patternsByTarget[target]).catch((error) => {
  console.error(error);
  process.exit(1);
});
