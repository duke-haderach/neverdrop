const path = require('path');
const { app } = require('electron');
const Database = require('better-sqlite3');
const { randomUUID } = require('crypto');
const uuidv4 = () => randomUUID();

const DB_PATH = path.join(app.getPath('userData'), 'neverdrop.db');
const db = new Database(DB_PATH);

// ── Schema ───────────────────────────────────────────────────────────────────
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS providers (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    base_url    TEXT NOT NULL,
    model       TEXT NOT NULL,
    adapter     TEXT NOT NULL DEFAULT 'openai',
    quota_daily INTEGER NOT NULL DEFAULT 0,
    used_today  INTEGER NOT NULL DEFAULT 0,
    exhausted   INTEGER NOT NULL DEFAULT 0,
    reset_at    TEXT,
    notes       TEXT,
    enabled     INTEGER NOT NULL DEFAULT 1,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id           TEXT PRIMARY KEY,
    title        TEXT NOT NULL DEFAULT 'New Chat',
    provider_id  TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id              TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role            TEXT NOT NULL CHECK(role IN ('user','assistant','system')),
    content         TEXT NOT NULL,
    provider_id     TEXT,
    provider_name   TEXT,
    model           TEXT,
    is_port_marker  INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_conv_updated ON conversations(updated_at DESC);
`);

// ── Provider helpers ──────────────────────────────────────────────────────────
const getProviders = () => db.prepare(`
  SELECT * FROM providers ORDER BY sort_order, created_at
`).all();

const getProvider = (id) => db.prepare(`
  SELECT * FROM providers WHERE id = ?
`).get(id);

const addProvider = (p) => {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO providers (id, name, base_url, model, adapter, quota_daily, reset_at, notes, sort_order)
    VALUES (@id, @name, @base_url, @model, @adapter, @quota_daily, @reset_at, @notes, @sort_order)
  `).run({
    id,
    name:        p.name,
    base_url:    p.base_url,
    model:       p.model,
    adapter:     p.adapter || detectAdapter(p.base_url),
    quota_daily: p.quota_daily || 0,
    reset_at:    p.reset_at || null,
    notes:       p.notes || null,
    sort_order:  p.sort_order || getProviders().length,
  });
  return getProvider(id);
};

const updateProvider = (p) => {
  db.prepare(`
    UPDATE providers SET
      name        = @name,
      base_url    = @base_url,
      model       = @model,
      adapter     = @adapter,
      quota_daily = @quota_daily,
      reset_at    = @reset_at,
      notes       = @notes,
      enabled     = @enabled,
      updated_at  = datetime('now')
    WHERE id = @id
  `).run(p);
  return getProvider(p.id);
};

const deleteProvider = (id) => {
  db.prepare(`DELETE FROM providers WHERE id = ?`).run(id);
  return { ok: true };
};

const incrementUsage = (id) => {
  db.prepare(`
    UPDATE providers SET used_today = used_today + 1, updated_at = datetime('now')
    WHERE id = ?
  `).run(id);
  // Auto-exhaust if over quota
  const p = getProvider(id);
  if (p.quota_daily > 0 && p.used_today >= p.quota_daily) {
    markExhausted(id);
  }
};

const markExhausted = (id) => {
  db.prepare(`
    UPDATE providers SET exhausted = 1, enabled = 0, updated_at = datetime('now')
    WHERE id = ?
  `).run(id);
};

const resetUsage = (id) => {
  db.prepare(`
    UPDATE providers SET used_today = 0, exhausted = 0, enabled = 1, updated_at = datetime('now')
    WHERE id = ?
  `).run(id);
  return getProvider(id);
};

// ── Conversation helpers ──────────────────────────────────────────────────────
const getConversations = () => db.prepare(`
  SELECT c.*, COUNT(m.id) as message_count
  FROM conversations c
  LEFT JOIN messages m ON m.conversation_id = c.id AND m.is_port_marker = 0
  GROUP BY c.id
  ORDER BY c.updated_at DESC
`).all();

const getConversation = (id) => db.prepare(`
  SELECT * FROM conversations WHERE id = ?
`).get(id);

const createConversation = (title) => {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO conversations (id, title) VALUES (?, ?)
  `).run(id, title || 'New Chat');
  return getConversation(id);
};

const deleteConversation = (id) => {
  db.prepare(`DELETE FROM conversations WHERE id = ?`).run(id);
  return { ok: true };
};

const renameConversation = (id, title) => {
  db.prepare(`UPDATE conversations SET title = ?, updated_at = datetime('now') WHERE id = ?`).run(title, id);
  return getConversation(id);
};

const touchConversation = (id) => {
  db.prepare(`UPDATE conversations SET updated_at = datetime('now') WHERE id = ?`).run(id);
};

// ── Message helpers ───────────────────────────────────────────────────────────
const getMessages = (conversationId) => db.prepare(`
  SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC
`).all(conversationId);

const addMessage = (msg) => {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO messages (id, conversation_id, role, content, provider_id, provider_name, model, is_port_marker)
    VALUES (@id, @conversation_id, @role, @content, @provider_id, @provider_name, @model, @is_port_marker)
  `).run({
    id,
    conversation_id: msg.conversation_id,
    role:            msg.role,
    content:         msg.content,
    provider_id:     msg.provider_id || null,
    provider_name:   msg.provider_name || null,
    model:           msg.model || null,
    is_port_marker:  msg.is_port_marker ? 1 : 0,
  });
  touchConversation(msg.conversation_id);
  return { id, ...msg };
};

// ── Utils ─────────────────────────────────────────────────────────────────────
function detectAdapter(baseUrl) {
  const u = (baseUrl || '').toLowerCase();
  if (u.includes('anthropic')) return 'anthropic';
  if (u.includes('generativelanguage.googleapis') || u.includes('google')) return 'gemini';
  // Everything else (OpenAI, Mistral, Groq, xAI, Ollama, Together, Perplexity...) is OpenAI-compatible
  return 'openai';
}

module.exports = {
  getProviders, getProvider, addProvider, updateProvider, deleteProvider,
  incrementUsage, markExhausted, resetUsage,
  getConversations, getConversation, createConversation, deleteConversation,
  renameConversation,
  getMessages, addMessage,
};
