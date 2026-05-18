const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { initDb } = require('./db/schema');
const { registerChatHandlers } = require('./ipc/chat');
const { registerConversationHandlers } = require('./ipc/conversations');
const { registerProviderHandlers } = require('./ipc/providers');
const { registerMcpHandlers } = require('./ipc/mcp');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#131417',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  const db = initDb();
  registerConversationHandlers(ipcMain, db);
  registerProviderHandlers(ipcMain, db);
  registerChatHandlers(ipcMain, db, () => mainWindow);
  registerMcpHandlers(ipcMain, db, () => mainWindow);
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
