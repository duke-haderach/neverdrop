import { useState, useEffect, useCallback } from 'react';

export function useMcp() {
  const [servers, setServers] = useState([]);

  const refresh = useCallback(async () => {
    const list = await window.api.listMcpServers();
    setServers(list || []);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const addServer    = useCallback(async (c)  => { const r = await window.api.addMcpServer(c);    await refresh(); return r; }, [refresh]);
  const removeServer = useCallback(async (id) => { await window.api.removeMcpServer(id);           await refresh(); },         [refresh]);
  const connect      = useCallback(async (id) => { const r = await window.api.connectMcpServer(id); await refresh(); return r; }, [refresh]);
  const disconnect   = useCallback(async (id) => { await window.api.disconnectMcpServer(id);        await refresh(); },         [refresh]);

  const buildContext = useCallback(async (query, mcpServerIds) => {
    if (!mcpServerIds?.length) return null;
    const res = await window.api.buildMcpContext({ query, mcpServerIds });
    return res.context || null;
  }, []);

  return { servers, refresh, addServer, removeServer, connect, disconnect, buildContext };
}
