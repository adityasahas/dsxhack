const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

const isWindows = os.platform() === 'win32';
const pythonPath = isWindows 
  ? path.join(__dirname, 'venv', 'Scripts', 'python.exe')
  : path.join(__dirname, 'venv', 'bin', 'python');

const child = spawn(pythonPath, ['main.py'], {
  cwd: __dirname,
  stdio: 'inherit'
});

child.on('error', (err) => {
  console.error('Failed to start Python server:', err);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code || 0);
});

