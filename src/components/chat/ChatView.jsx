import React, { useEffect, useRef, useState } from 'react';
import { useChat }         from '../../hooks/useChat';
import { useMcp }          from '../../hooks/useMcp';
import { MessageBubble }   from './MessageBubble';
import { ChatInput }       from './ChatInput';
import { renderMarkdown }  from '../../lib/markdown';

export function ChatView({ conversation, providerId, systemPrompt, mcpServerIds }) {
  const { messages, streaming, busy, send } = useChat(conversation?.id);
  const { buildContext } = useMcp();
  const [input, setInput]         = useState('');
  const [mcpContext, setMcpCtx]   = useState(null);
  const [portModal, setPortModal] = useState(false);
  const [portStrategy, setPortStrategy] = useState('summary_recent');
  const [portResult, setPortResult]     = useState(null);
  const bottomRef  = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  // Debounced MCP context fetch
  useEffect(() => {
    if (!input.trim() || !mcpServerIds?.length) { setMcpCtx(null); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const ctx = await buildContext(input, mcpServerIds);
      if (ctx?.trim()) setMcpCtx(ctx);
    }, 700);
    return () => clearTimeout(debounceRef.current);
  }, [input, mcpServerIds, buildContext]);

  async function handleSend() {
    if (!input.trim() || !providerId || busy) return;
    const snap = input; const ctxSnap = mcpContext;
    setInput(''); setMcpCtx(null);
    await send({ input: snap, providerId, systemPrompt, mcpServerIds, portedContext: ctxSnap });
  }

  async function handlePort() {
    const res = await window.api.portContext({ conversationId: conversation.id, strategy: portStrategy });
    if (res.ok) setPortResult(res.portedContext);
  }

  if (!conversation) return (
    <main style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:14, color:'var(--muted)' }}>
      <div style={{ fontSize:48, lineHeight:1 }}>✦</div>
      <div style={{ fontSize:22, fontWeight:800, color:'var(--text)' }}>NeverDrop MCP</div>
      <div style={{ fontSize:14 }}>Select a conversation or create a new one</div>
    </main>
  );

  return (
    <main style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, overflow:'hidden' }}>
      {/* Toolbar */}
      <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', background:'var(--panel)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontWeight:700, fontSize:15 }}>{conversation.title}</div>
          <div style={{ fontSize:11, color:'var(--muted)', marginTop:1 }}>
            {conversation.model || 'No model'} · {messages.length} messages
            {mcpServerIds?.length ? ` · ${mcpServerIds.length} MCP` : ''}
          </div>
        </div>
        <button onClick={() => { setPortModal(true); setPortResult(null); }}
          style={{ background:'var(--panel-3)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'7px 13px', fontSize:13, fontWeight:600 }}>
          ⇄ Port context
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', paddingTop:20, paddingBottom:8, background:'var(--bg)' }}>
        {messages.length === 0 && !busy && (
          <div style={{ textAlign:'center', color:'var(--faint)', fontSize:13, paddingTop:60 }}>No messages yet. Start the conversation.</div>
        )}
        {messages.map(m => <MessageBubble key={m.id} message={m} />)}
        {streaming && (
          <div style={{ padding:'0 24px', marginBottom:16, display:'flex' }}>
            <div style={{ width:30, height:30, borderRadius:'50%', flexShrink:0, background:'linear-gradient(135deg,var(--accent),#0891b2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, marginRight:10, marginTop:2 }}>✦</div>
            <div style={{ maxWidth:'74%', padding:'12px 16px', borderRadius:'18px 18px 18px 6px', background:'var(--panel)', border:'1px solid var(--border)', fontSize:14, lineHeight:1.65 }}>
              <div className="msg-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(streaming) }} />
              <span style={{ display:'inline-block', width:8, height:14, background:'var(--accent)', borderRadius:2, marginLeft:2, animation:'blink 0.8s steps(1) infinite' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <ChatInput value={input} onChange={setInput} onSend={handleSend} busy={busy}
        mcpContext={mcpContext} onDismissMcp={() => setMcpCtx(null)} disabled={!providerId} />

      {/* Port context modal */}
      {portModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}
          onClick={e => { if (e.target === e.currentTarget) setPortModal(false); }}>
          <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:28, width:500, maxWidth:'90vw', boxShadow:'var(--shadow)' }}>
            <div style={{ fontWeight:800, fontSize:16, marginBottom:16 }}>⇄ Port context to another provider</div>
            <div style={{ fontSize:13, color:'var(--muted)', marginBottom:16 }}>
              Generates a context snapshot from this conversation. Paste it when starting a new chat on a different provider.
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.06em', display:'block', marginBottom:6 }}>Strategy</label>
              {[['summary_recent','Summary + Recent 20 (recommended)'],['summary_only','Summary only (minimal tokens)'],['full','Full verbatim history']].map(([v,l]) => (
                <label key={v} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, cursor:'pointer', fontSize:13 }}>
                  <input type="radio" name="strategy" value={v} checked={portStrategy===v} onChange={() => setPortStrategy(v)} />
                  {l}
                </label>
              ))}
            </div>
            <button onClick={handlePort}
              style={{ background:'var(--accent)', color:'#fff', border:'none', borderRadius:'var(--radius-sm)', padding:'10px 20px', fontWeight:700, fontSize:13, marginBottom:16 }}>
              Generate context snapshot
            </button>
            {portResult && (
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--accent)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>Context ready — copy and paste into new chat</div>
                <textarea readOnly value={portResult} onClick={e => e.target.select()}
                  style={{ width:'100%', minHeight:120, background:'var(--panel-2)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:10, fontSize:12, fontFamily:'var(--font-mono)', color:'var(--text)', resize:'vertical' }} />
              </div>
            )}
            <button onClick={() => setPortModal(false)} style={{ marginTop:12, fontSize:13, color:'var(--muted)' }}>Close</button>
          </div>
        </div>
      )}
    </main>
  );
}
