const { buildAdapter } = require('../providers');

function registerChatHandlers(ipcMain, db, getWindow) {
  ipcMain.handle('chat:send', async (_, { conversationId, input, providerId, systemPrompt, mcpServerIds, portedContext }) => {
    try {
      const providerRow = db.prepare('SELECT * FROM providers WHERE id = ?').get(providerId);
      if (!providerRow) return { ok: false, error: 'Provider not found' };

      const adapter = await buildAdapter(providerRow);

      // Build message history
      const history = db.prepare(
        `SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY id ASC`
      ).all(conversationId);

      // Compose system prompt: MCP context + user system prompt + ported context
      let fullSystem = '';
      if (portedContext) fullSystem += `[Ported context]\n${portedContext}\n\n`;
      if (systemPrompt) fullSystem += systemPrompt;

      const messages = [...history, { role: 'user', content: input }];

      const win = getWindow();
      const { output, tokensIn, tokensOut } = await adapter.streamChat(
        messages,
        fullSystem || undefined,
        (token) => {
          if (win && !win.isDestroyed()) {
            win.webContents.send('chat:token', { conversationId, token });
          }
        }
      );

      return { ok: true, output, tokensIn, tokensOut };
    } catch (err) {
      console.error('chat:send error', err);
      return { ok: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle('chat:port', async (_, { conversationId, strategy, targetProviderId }) => {
    try {
      const messages = db.prepare(
        `SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY id ASC`
      ).all(conversationId);

      const conv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId);

      let portedContext = '';
      if (strategy === 'full') {
        portedContext = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
      } else if (strategy === 'summary_only') {
        portedContext = conv.summary || messages.slice(-5).map(m => `${m.role}: ${m.content.slice(0, 300)}`).join('\n');
      } else {
        // summary + recent 20 (default)
        const recent = messages.slice(-20).map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
        const summary = conv.summary ? `[Summary]\n${conv.summary}\n\n` : '';
        portedContext = summary + `[Recent messages]\n${recent}`;
      }

      return { ok: true, portedContext };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });
}

module.exports = { registerChatHandlers };
