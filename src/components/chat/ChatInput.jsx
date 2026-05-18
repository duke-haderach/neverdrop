import React, { useRef, useEffect } from 'react';

export function ChatInput({ value, onChange, onSend, busy, mcpContext, onDismissMcp, disabled }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = 'auto';
    ref.current.style.height = Math.min(ref.current.scrollHeight, 220) + 'px';
  }, [value]);

  return (
    <div style={{ padding:'12px 20px 18px', background:'var(--panel)', borderTop:'1px solid var(--border)' }}>
      {mcpContext && (
        <div style={{ marginBottom:10, padding:'10px 14px', borderRadius:'var(--radius-sm)', border:'1px solid #1a5f5e', background:'#0c2a2a' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
            <span style={{ fontSize:11, fontWeight:700, color:'var(--accent)', letterSpacing:'.06em', textTransform:'uppercase' }}>⚡ MCP Context injected</span>
            <button onClick={onDismissMcp} style={{ fontSize:13, color:'var(--muted)' }}>✕</button>
          </div>
          <div style={{ fontSize:12, color:'var(--muted)', maxHeight:90, overflowY:'auto', whiteSpace:'pre-wrap', lineHeight:1.5 }}>
            {mcpContext.slice(0,400)}{mcpContext.length > 400 ? '…' : ''}
          </div>
        </div>
      )}
      <div style={{ display:'flex', gap:12, alignItems:'flex-end' }}>
        <textarea ref={ref} value={value} onChange={e => onChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
          disabled={disabled || busy}
          placeholder={disabled ? 'Select a provider to start chatting…' : 'Ask anything… (Enter to send, Shift+Enter for newline)'}
          style={{ flex:1, minHeight:52, maxHeight:220, resize:'none', background:'var(--panel-2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'14px 16px', fontSize:14, lineHeight:1.55, outline:'none', color: disabled ? 'var(--muted)' : 'var(--text)' }}
          onFocus={e => e.target.style.borderColor='var(--accent)'}
          onBlur={e => e.target.style.borderColor='var(--border)'} />
        <button onClick={onSend} disabled={disabled || busy || !value.trim()}
          style={{ background:'var(--accent)', color:'#fff', border:'none', borderRadius:'var(--radius)', padding:'0 22px', height:52, minWidth:90, fontSize:14, fontWeight:700, opacity: (disabled||busy||!value.trim()) ? 0.5 : 1, transition:'opacity .15s,background .15s' }}
          onMouseEnter={e => { if (!disabled&&!busy) e.currentTarget.style.background='var(--accent-h)'; }}
          onMouseLeave={e => { e.currentTarget.style.background='var(--accent)'; }}>
          {busy ? '…' : '↑ Send'}
        </button>
      </div>
    </div>
  );
}
