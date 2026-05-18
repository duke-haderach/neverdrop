let keytar;
try { keytar = require('keytar'); } catch { keytar = null; }

const SERVICE = 'neverdrop';

function registerProviderHandlers(ipcMain, db) {
  ipcMain.handle('providers:list', async () => {
    const rows = db.prepare('SELECT * FROM providers WHERE enabled = 1 ORDER BY id ASC').all();
    return rows.map(r => ({ ...r, hasKey: true })); // key presence checked on use
  });

  ipcMain.handle('providers:save', async (_, p) => {
    const info = db.prepare(`
      INSERT INTO providers (provider, label, model, base_url, enabled)
      VALUES (@provider, @label, @model, @base_url, 1)
    `).run({ provider: p.provider, label: p.label, model: p.model, base_url: p.base_url || null });
    const id = info.lastInsertRowid;
    if (p.apiKey && keytar) {
      await keytar.setPassword(SERVICE, String(id), p.apiKey);
    }
    return db.prepare('SELECT * FROM providers WHERE id = ?').get(id);
  });

  ipcMain.handle('providers:delete', async (_, id) => {
    db.prepare('DELETE FROM providers WHERE id = ?').run(id);
    if (keytar) await keytar.deletePassword(SERVICE, String(id)).catch(() => {});
    return { ok: true };
  });
}

async function getApiKey(providerId) {
  if (!keytar) return null;
  return keytar.getPassword(SERVICE, String(providerId));
}

module.exports = { registerProviderHandlers, getApiKey };
