const { app, BrowserWindow, ipcMain, shell, nativeTheme } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// ── Window ──────────────────────────────────────────────────────────────────
let mainWindow;

function createWindow() {
  nativeTheme.themeSource = 'dark';

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#0a0a0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
    show: false,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (!mainWindow) createWindow(); });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── IPC Handlers ─────────────────────────────────────────────────────────────
const db = require('./db');
const keystore = require('./keystore');
const llmRouter = require('./llm-router');
const portEngine = require('./port-engine');

// Providers
ipcMain.handle('providers:list', () => db.getProviders());
ipcMain.handle('providers:add', (_, provider) => db.addProvider(provider));
ipcMain.handle('providers:update', (_, provider) => db.updateProvider(provider));
ipcMain.handle('providers:delete', (_, id) => db.deleteProvider(id));

// API Keys (keychain)
ipcMain.handle('keys:set', async (_, providerId, apiKey) => {
  await keystore.setKey(providerId, apiKey);
  return { ok: true };
});
ipcMain.handle('keys:get', async (_, providerId) => {
  return keystore.getKey(providerId);
});
ipcMain.handle('keys:delete', async (_, providerId) => {
  await keystore.deleteKey(providerId);
  return { ok: true };
});

// Conversations
ipcMain.handle('conversations:list', () => db.getConversations());
ipcMain.handle('conversations:get', (_, id) => db.getConversation(id));
ipcMain.handle('conversations:create', (_, title) => db.createConversation(title));
ipcMain.handle('conversations:delete', (_, id) => db.deleteConversation(id));
ipcMain.handle('conversations:rename', (_, id, title) => db.renameConversation(id, title));

// Messages
ipcMain.handle('messages:list', (_, conversationId) => db.getMessages(conversationId));
ipcMain.handle('messages:add', (_, msg) => db.addMessage(msg));

// LLM
ipcMain.handle('llm:chat', async (_, { providerId, messages, stream }) => {
  const provider = db.getProvider(providerId);
  if (!provider) throw new Error('Provider not found');
  const apiKey = await keystore.getKey(providerId);
  if (!apiKey) throw new Error('No API key configured for this provider');

  try {
    const reply = await llmRouter.chat({ provider, apiKey, messages });
    db.incrementUsage(providerId);
    const updated = db.getProvider(providerId);
    return { reply, provider: updated };
  } catch (err) {
    if (isQuotaError(err)) {
      db.markExhausted(providerId);
      throw Object.assign(new Error('QUOTA_EXHAUSTED'), { code: 'QUOTA_EXHAUSTED' });
    }
    throw err;
  }
});

ipcMain.handle('llm:port', async (_, { fromProviderId, toProviderId, conversationId, strategy }) => {
  const messages = db.getMessages(conversationId);
  const toProvider = db.getProvider(toProviderId);
  const fromProvider = db.getProvider(fromProviderId);
  const apiKey = await keystore.getKey(toProviderId);

  const portPrompt = await portEngine.buildPortPrompt({
    messages,
    fromProvider,
    toProvider,
    strategy: strategy || 'both',
    apiKey,
  });

  return portPrompt;
});

ipcMain.handle('usage:reset', (_, providerId) => db.resetUsage(providerId));
ipcMain.handle('usage:reset-all', () => {
  const providers = db.getProviders();
  providers.forEach(p => db.resetUsage(p.id));
  return { ok: true };
});

function isQuotaError(err) {
  const msg = (err.message || '').toLowerCase();
  const status = err.status || err.statusCode || (err.error && err.error.status);

  // Log actual error for debugging — never swallow silently
  console.error('[NeverDrop] LLM error:', { status, message: err.message });

  // Only mark exhausted for genuine quota/billing errors, not generic failures
  if (status === 429) return true;
  // Very specific phrases that unambiguously mean quota exhaustion
  if (msg.includes('insufficient_quota')) return true;
  if (msg.includes('quota exceeded')) return true;
  if (msg.includes('rate limit exceeded')) return true;
  if (msg.includes('daily limit')) return true;
  if (msg.includes('monthly limit')) return true;
  if (msg.includes('resource_exhausted')) return true; // Google/Gemini specific
  if (msg.includes('out of credits')) return true;
  return false;
}
