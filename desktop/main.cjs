const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('node:path');
const net = require('node:net');
const { pathToFileURL } = require('node:url');

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

async function waitForServer(url, attempts = 100) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch { /* server not ready yet */ }
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('Server did not start');
}

async function startServer() {
  const port = await freePort();
  Object.assign(process.env, require('./env.json'), { NITRO_PORT: String(port), NITRO_HOST: '127.0.0.1', PORT: String(port), HOST: '127.0.0.1', NODE_ENV: 'production' });
  await import(pathToFileURL(path.join(__dirname, 'server', 'server', 'index.mjs')).href);
  const url = `http://127.0.0.1:${port}`;
  await waitForServer(url);
  return url;
}

if (!app.requestSingleInstanceLock()) app.quit();

app.whenReady().then(async () => {
  try {
    const url = await startServer();
    const win = new BrowserWindow({ width: 1400, height: 900, minWidth: 1000, minHeight: 700, title: 'S3R Sticker Creator', autoHideMenuBar: true, show: false });
    win.webContents.setWindowOpenHandler(({ url: target }) => {
      if (!target.startsWith(url)) shell.openExternal(target);
      return { action: target.startsWith(url) ? 'allow' : 'deny' };
    });
    win.once('ready-to-show', () => { win.maximize(); win.show(); });
    app.on('second-instance', () => { if (win.isMinimized()) win.restore(); win.focus(); });
    await win.loadURL(url);
  } catch (err) {
    dialog.showErrorBox('S3R Sticker Creator', String(err?.stack || err));
    app.quit();
  }
});

app.on('window-all-closed', () => app.quit());
