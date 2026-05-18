const { McpHost } = require('../mcp/host');
const host = new McpHost();

function registerMcpHandlers(ipcMain, db) {
  ipcMain.handle('mcp:list', () => {
    const rows = db.prepare('SELECT * FROM mcp_servers ORDER BY id ASC').all();
    return rows.map(r => {
      const status = host.getStatus(String(r.id));
      return {
        ...r,
        args: JSON.parse(r.args || '[]'),
        env:  JSON.parse(r.env  || '{}'),
        connected: status.connected,
        tools: status.tools,
      };
    });
  });

  ipcMain.handle('mcp:add', (_, cfg) => {
    try {
      const info = db.prepare(`
        INSERT INTO mcp_servers (name, command, args, env, enabled)
        VALUES (@name, @command, @args, @env, 1)
      `).run({
        name: cfg.name,
        command: cfg.command,
        args: JSON.stringify(cfg.args || []),
        env:  JSON.stringify(cfg.env  || {}),
      });
      return { ok: true, id: info.lastInsertRowid };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('mcp:remove', async (_, id) => {
    await host.disconnect(String(id)).catch(() => {});
    db.prepare('DELETE FROM mcp_servers WHERE id = ?').run(id);
    return { ok: true };
  });

  ipcMain.handle('mcp:connect', async (_, id) => {
    try {
      const row = db.prepare('SELECT * FROM mcp_servers WHERE id = ?').get(id);
      if (!row) return { ok: false, error: 'Server not found' };
      const args = JSON.parse(row.args || '[]');
      const env  = JSON.parse(row.env  || '{}');
      const result = await host.connect(String(id), row.command, args, env);
      return { ok: true, ...result };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('mcp:disconnect', async (_, id) => {
    await host.disconnect(String(id)).catch(() => {});
    return { ok: true };
  });

  ipcMain.handle('mcp:buildContext', async (_, { query, mcpServerIds }) => {
    try {
      const context = await host.buildContext(query, mcpServerIds.map(String));
      return { ok: true, context };
    } catch (e) {
      return { ok: false, context: null, error: e.message };
    }
  });
}

module.exports = { registerMcpHandlers };
