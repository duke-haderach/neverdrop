import { useState, useEffect, useCallback, useRef } from 'react';

export function useChat(conversationId) {
  const [messages, setMessages]   = useState([]);
  const [streaming, setStreaming] = useState('');
  const [busy, setBusy]           = useState(false);
  const streamRef  = useRef('');
  const cleanupRef = useRef(null);

  useEffect(() => {
    if (!conversationId) { setMessages([]); return; }
    window.api.listMessages(conversationId).then(setMessages);
    streamRef.current = '';
    setStreaming('');
  }, [conversationId]);

  useEffect(() => {
    if (cleanupRef.current) cleanupRef.current();
    const unsub = window.api.onChatToken(({ conversationId: cid, token }) => {
      if (cid !== conversationId) return;
      streamRef.current += token;
      setStreaming(streamRef.current);
    });
    cleanupRef.current = unsub;
    return () => { if (unsub) unsub(); };
  }, [conversationId]);

  const send = useCallback(async ({ input, providerId, systemPrompt = '', mcpServerIds = [], portedContext = null }) => {
    if (!conversationId || !input.trim() || !providerId || busy) return;
    setBusy(true);
    streamRef.current = '';
    setStreaming('');

    const userMsg = await window.api.saveMessage({ conversation_id: conversationId, role: 'user', content: input });
    setMessages(prev => [...prev, userMsg]);

    const res = await window.api.sendChat({ conversationId, input, providerId, systemPrompt, mcpServerIds, portedContext });

    if (res.ok) {
      const aMsg = await window.api.saveMessage({
        conversation_id: conversationId, role: 'assistant', content: res.output,
        tokens_in: res.tokensIn, tokens_out: res.tokensOut,
      });
      setMessages(prev => [...prev, aMsg]);
    } else {
      const eMsg = await window.api.saveMessage({ conversation_id: conversationId, role: 'assistant', content: `⚠️ ${res.error}` });
      setMessages(prev => [...prev, eMsg]);
    }

    streamRef.current = '';
    setStreaming('');
    setBusy(false);
    return res;
  }, [conversationId, busy]);

  return { messages, streaming, busy, send };
}
