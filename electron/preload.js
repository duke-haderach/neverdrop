const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Conversations
  listConversations:  ()      => ipcRenderer.invoke('conversations:list'),
  createConversation: (opts)  => ipcRenderer.invoke('conversations:create', opts),
  renameConversation: (opts)  => ipcRenderer.invoke('conversations:rename', opts),
  deleteConversation: (id)    => ipcRenderer.invoke('conversations:delete', id),
  listMessages:       (cid)   => ipcRenderer.invoke('messages:list', cid),
  saveMessage:        (msg)   => ipcRenderer.invoke('messages:save', msg),

  // Providers
  listProviders:  ()  => ipcRenderer.invoke('providers:list'),
  saveProvider:   (p) => ipcRenderer.invoke('providers:save', p),
  deleteProvider: (id)=> ipcRenderer.invoke('providers:delete', id),

  // Chat
  sendChat:     (opts) => ipcRenderer.invoke('chat:send', opts),
  portContext:  (opts) => ipcRenderer.invoke('chat:port', opts),
  onChatToken:  (cb)   => {
    const handler = (_, data) => cb(data);
    ipcRenderer.on('chat:token', handler);
    return () => ipcRenderer.removeListener('chat:token', handler);
  },

  // MCP
  listMcpServers:    ()     => ipcRenderer.invoke('mcp:list'),
  addMcpServer:      (cfg)  => ipcRenderer.invoke('mcp:add', cfg),
  removeMcpServer:   (id)   => ipcRenderer.invoke('mcp:remove', id),
  connectMcpServer:  (id)   => ipcRenderer.invoke('mcp:connect', id),
  disconnectMcpServer:(id)  => ipcRenderer.invoke('mcp:disconnect', id),
  buildMcpContext:   (opts) => ipcRenderer.invoke('mcp:buildContext', opts),
});
