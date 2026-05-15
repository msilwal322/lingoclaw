#!/usr/bin/env node
const { spawn } = require('node:child_process');
const { existsSync, mkdirSync, openSync } = require('node:fs');
const { join } = require('node:path');

const repoRoot = '/home/azureuser/lingoclaw';
const logsDir = join(repoRoot, '.run-logs');
const target = process.argv[2] ?? 'all';

const commandsByTarget = {
  backend: [
    {
      name: 'backend',
      command: 'npm',
      args: ['run', 'start:dev', '--prefix', 'backend'],
      logFile: join(logsDir, 'backend-dev.log'),
    },
  ],
  frontend: [
    {
      name: 'frontend',
      command: 'npm',
      args: ['run', 'dev', '--prefix', 'frontend'],
      logFile: join(logsDir, 'frontend-dev.log'),
    },
  ],
  all: [
    {
      name: 'backend',
      command: 'npm',
      args: ['run', 'start:dev', '--prefix', 'backend'],
      logFile: join(logsDir, 'backend-dev.log'),
    },
    {
      name: 'frontend',
      command: 'npm',
      args: ['run', 'dev', '--prefix', 'frontend'],
      logFile: join(logsDir, 'frontend-dev.log'),
    },
  ],
};

if (!commandsByTarget[target]) {
  console.error(`Unknown target: ${target}. Use one of: backend, frontend, all`);
  process.exit(1);
}

if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
}

for (const proc of commandsByTarget[target]) {
  const fd = openSync(proc.logFile, 'a');
  const child = spawn(proc.command, proc.args, {
    cwd: repoRoot,
    detached: true,
    stdio: ['ignore', fd, fd],
    env: process.env,
  });
  child.unref();
  console.log(`Started ${proc.name} (pid ${child.pid}), logging to ${proc.logFile}`);
}
