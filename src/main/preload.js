const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Providers
  providers: {
    list:   ()           => ipcRenderer.invoke('providers:list'),
    add:    (p)          => ipcRenderer.invoke('providers:add', p),
    update: (p)          => ipcRenderer.invoke('providers:update', p),
    delete: (id)         => ipcRenderer.invoke('providers:delete', id),
  },
  // Keys (OS keychain)
  keys: {
    set:    (id, key)    => ipcRenderer.invoke('keys:set', id, key),
    get:    (id)         => ipcRenderer.invoke('keys:get', id),
    delete: (id)         => ipcRenderer.invoke('keys:delete', id),
  },
  // Conversations
  conversations: {
    list:   ()           => ipcRenderer.invoke('conversations:list'),
    get:    (id)         => ipcRenderer.invoke('conversations:get', id),
    create: (title)      => ipcRenderer.invoke('conversations:create', title),
    delete: (id)         => ipcRenderer.invoke('conversations:delete', id),
    rename: (id, title)  => ipcRenderer.invoke('conversations:rename', id, title),
  },
  // Messages
  messages: {
    list:   (convId)     => ipcRenderer.invoke('messages:list', convId),
    add:    (msg)        => ipcRenderer.invoke('messages:add', msg),
  },
  // LLM
  llm: {
    chat:   (opts)       => ipcRenderer.invoke('llm:chat', opts),
    port:   (opts)       => ipcRenderer.invoke('llm:port', opts),
  },
  // Usage
  usage: {
    reset:  (id)         => ipcRenderer.invoke('usage:reset', id),
    resetAll: ()         => ipcRenderer.invoke('usage:resetAll'),
  },
  // Auto-updater
  updater: {
    onUpdateAvailable: (cb) => ipcRenderer.on('update:available', (_, info) => cb(info)),
    onUpdateDownloaded: (cb) => ipcRenderer.on('update:downloaded', (_, info) => cb(info)),
    restartAndInstall: () => ipcRenderer.invoke('updater:restart'),
  },
});
