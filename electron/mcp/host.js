const { spawn } = require('child_process');

class McpHost {
  constructor() {
    this.servers = new Map(); // id -> { process, tools, pending, buffer }
  }

  async connect(id, command, args = [], env = {}) {
    if (this.servers.has(id)) await this.disconnect(id);

    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, {
        env: { ...process.env, ...env },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const server = { process: proc, tools: [], pending: new Map(), buffer: '', connected: false };
      this.servers.set(id, server);

      proc.stderr.on('data', d => console.error(`[mcp:${id}]`, d.toString()));

      proc.stdout.on('data', data => {
        server.buffer += data.toString();
        const lines = server.buffer.split('\n');
        server.buffer = lines.pop();
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            if (msg.id !== undefined && server.pending.has(msg.id)) {
              const { resolve, reject } = server.pending.get(msg.id);
              server.pending.delete(msg.id);
              if (msg.error) reject(new Error(msg.error.message));
              else resolve(msg.result);
            }
          } catch (e) { console.error('[mcp] parse error', e); }
        }
      });

      proc.on('error', err => { this.servers.delete(id); reject(err); });
      proc.on('exit', () => { this.servers.delete(id); });

      // Initialize
      this._send(id, 'initialize', {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        clientInfo: { name: 'neverdrop', version: '1.1.0' },
      }).then(result => {
        server.connected = true;
        return this._send(id, 'tools/list', {});
      }).then(result => {
        server.tools = (result?.tools || []).map(t => t.name);
        resolve({ ok: true, tools: server.tools });
      }).catch(err => {
        this.servers.delete(id);
        reject(err);
      });
    });
  }

  async disconnect(id) {
    const server = this.servers.get(id);
    if (!server) return;
    server.process.kill();
    this.servers.delete(id);
  }

  _send(id, method, params) {
    const server = this.servers.get(id);
    if (!server) return Promise.reject(new Error('Server not connected'));
    const msgId = Date.now() + Math.random();
    return new Promise((resolve, reject) => {
      server.pending.set(msgId, { resolve, reject });
      const msg = JSON.stringify({ jsonrpc: '2.0', id: msgId, method, params });
      server.process.stdin.write(msg + '\n');
      setTimeout(() => {
        if (server.pending.has(msgId)) {
          server.pending.delete(msgId);
          reject(new Error(`MCP timeout: ${method}`));
        }
      }, 15000);
    });
  }

  async callTool(id, toolName, args) {
    return this._send(id, 'tools/call', { name: toolName, arguments: args });
  }

  async buildContext(query, serverIds) {
    const parts = [];
    for (const id of serverIds) {
      const server = this.servers.get(id);
      if (!server?.connected) continue;
      // Try search_history first, fall back to first available tool
      const tool = server.tools.includes('search_history') ? 'search_history'
        : server.tools.includes('search') ? 'search'
        : server.tools[0];
      if (!tool) continue;
      try {
        const result = await this.callTool(id, tool, { query, limit: 5 });
        const content = result?.content?.[0]?.text || JSON.stringify(result);
        if (content) parts.push(`[${id}:${tool}]\n${content}`);
      } catch (e) { console.error('[mcp] buildContext error', e); }
    }
    return parts.join('\n\n---\n\n');
  }

  getStatus(id) {
    const s = this.servers.get(id);
    return s ? { connected: s.connected, tools: s.tools } : { connected: false, tools: [] };
  }
}

module.exports = { McpHost };
