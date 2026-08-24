#!/usr/bin/env node
import { startServer } from '../src/server.mjs';
import { exec } from 'child_process';

const args = process.argv.slice(2);
const noOpen = args.includes('--no-open');
const portArgIdx = args.findIndex(a => a === '--port' || a === '-p');
const port = portArgIdx !== -1 ? parseInt(args[portArgIdx + 1], 10) : 7890;

startServer(port, (actualPort) => {
  const url = `http://localhost:${actualPort}`;
  console.log('\x1b[36m%s\x1b[0m', '=====================================================');
  console.log('\x1b[32m%s\x1b[0m', `  🚀 MCP Control Panel is running!`);
  console.log('\x1b[33m%s\x1b[0m', `  🌐 Dashboard: ${url}`);
  console.log('\x1b[36m%s\x1b[0m', '=====================================================');
  console.log('\x1b[90m%s\x1b[0m', '  Press Ctrl+C to stop\n');

  if (!noOpen) {
    const cmd = process.platform === 'win32'
      ? `start "" "${url}"`
      : (process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`);
    exec(cmd, () => {});
  }
});
