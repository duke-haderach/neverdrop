import { useState, useEffect, useCallback } from 'react';

export function useConversations() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);

  const refresh = useCallback(async () => {
    const list = await window.api.listConversations();
    setConversations(list);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (opts = {}) => {
    const c = await window.api.createConversation(opts);
    await refresh();
    setActiveId(c.id);
    return c;
  }, [refresh]);

  const rename = useCallback(async (id, title) => {
    await window.api.renameConversation({ id, title });
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (id) => {
    await window.api.deleteConversation(id);
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeId === id) setActiveId(null);
  }, [activeId]);

  return { conversations, activeId, setActiveId, create, rename, remove, refresh };
}
