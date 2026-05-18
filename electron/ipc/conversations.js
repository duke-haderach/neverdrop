function registerConversationHandlers(ipcMain, db) {
  ipcMain.handle('conversations:list', () => {
    return db.prepare(`
      SELECT c.*, COUNT(m.id) as message_count
      FROM conversations c
      LEFT JOIN messages m ON m.conversation_id = c.id
      GROUP BY c.id
      ORDER BY c.updated_at DESC
    `).all();
  });

  ipcMain.handle('conversations:create', (_, opts = {}) => {
    const info = db.prepare(`
      INSERT INTO conversations (title, provider_id, model)
      VALUES (@title, @provider_id, @model)
    `).run({ title: opts.title || 'New chat', provider_id: opts.providerId || null, model: opts.model || null });
    return db.prepare('SELECT * FROM conversations WHERE id = ?').get(info.lastInsertRowid);
  });

  ipcMain.handle('conversations:rename', (_, { id, title }) => {
    db.prepare(`UPDATE conversations SET title = ?, updated_at = datetime('now') WHERE id = ?`).run(title, id);
    return { ok: true };
  });

  ipcMain.handle('conversations:delete', (_, id) => {
    db.prepare('DELETE FROM conversations WHERE id = ?').run(id);
    return { ok: true };
  });

  ipcMain.handle('messages:list', (_, conversationId) => {
    return db.prepare(`SELECT * FROM messages WHERE conversation_id = ? ORDER BY id ASC`).all(conversationId);
  });

  ipcMain.handle('messages:save', (_, msg) => {
    const info = db.prepare(`
      INSERT INTO messages (conversation_id, role, content, tokens_in, tokens_out)
      VALUES (@conversation_id, @role, @content, @tokens_in, @tokens_out)
    `).run({
      conversation_id: msg.conversation_id,
      role: msg.role,
      content: msg.content,
      tokens_in: msg.tokens_in || 0,
      tokens_out: msg.tokens_out || 0,
    });
    db.prepare(`UPDATE conversations SET updated_at = datetime('now') WHERE id = ?`).run(msg.conversation_id);

    // Update rolling summary every 10 assistant messages
    if (msg.role === 'assistant') {
      const count = db.prepare(`SELECT COUNT(*) as c FROM messages WHERE conversation_id = ? AND role = 'assistant'`).get(msg.conversation_id).c;
      if (count % 10 === 0) {
        const msgs = db.prepare(`SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY id DESC LIMIT 20`).all(msg.conversation_id).reverse();
        const summary = msgs.map(m => `${m.role}: ${m.content.slice(0, 200)}`).join('\n');
        db.prepare(`UPDATE conversations SET summary = ? WHERE id = ?`).run(summary, msg.conversation_id);
      }
    }

    return db.prepare('SELECT * FROM messages WHERE id = ?').get(info.lastInsertRowid);
  });
}

module.exports = { registerConversationHandlers };
