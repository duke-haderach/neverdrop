import React from 'react';
import { renderMarkdown } from '../../lib/markdown';

export function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <div style={{ display:'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', padding:'0 24px', marginBottom:16 }}>
      {!isUser && (
        <div style={{ width:30, height:30, borderRadius:'50%', flexShrink:0, background:'linear-gradient(135deg, var(--accent), #0891b2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, marginRight:10, marginTop:2 }}>✦</div>
      )}
      <div style={{ maxWidth:'74%', padding:'12px 16px',
        borderRadius: isUser ? '18px 18px 6px 18px' : '18px 18px 18px 6px',
        background: isUser ? 'linear-gradient(135deg,#0f4a4a,#0e3a3a)' : 'var(--panel)',
        border: `1px solid ${isUser ? '#1a6060' : 'var(--border)'}`,
        boxShadow:'var(--shadow)', fontSize:14, lineHeight:1.65 }}>
        <div className="msg-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }} />
        {(message.tokens_in || message.tokens_out) ? (
          <div style={{ marginTop:6, fontSize:11, color:'var(--faint)', textAlign:'right' }}>
            {message.tokens_in ? `↑${message.tokens_in}` : ''} {message.tokens_out ? `↓${message.tokens_out}` : ''} tokens
          </div>
        ) : null}
      </div>
    </div>
  );
}
