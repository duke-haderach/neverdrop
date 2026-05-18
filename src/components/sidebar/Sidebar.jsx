import React, { useState } from 'react';

export function Sidebar({ conversations, activeId, onSelect, onCreate, onRename, onDelete }) {
  const [search, setSearch] = useState('');
  const filtered = conversations.filter(c => c.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <aside style={{ width:270, minWidth:270, background:'var(--panel)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ padding:'18px 16px 14px', borderBottom:'1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div>
            <div style={{ fontWeight:800, fontSize:17, letterSpacing:'-0.3px' }}>NeverDrop</div>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:1 }}>MCP Edition · v1.1</div>
          </div>
          <button onClick={onCreate} style={{ background:'var(--accent)', color:'#fff', borderRadius:'var(--radius-sm)', padding:'7px 13px', fontSize:13, fontWeight:700 }}>+ New</button>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search chats…"
          style={{ width:'100%', background:'var(--panel-2)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'8px 10px', fontSize:13, outline:'none' }} />
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'8px' }}>
        {filtered.length === 0 && (
          <div style={{ textAlign:'center', color:'var(--faint)', fontSize:13, paddingTop:40 }}>
            {search ? 'No matching chats' : 'No conversations yet'}
          </div>
        )}
        {filtered.map(c => (
          <ConvItem key={c.id} c={c} active={activeId === c.id}
            onSelect={() => onSelect(c.id)}
            onRename={() => { const t = window.prompt('Rename:', c.title); if (t?.trim()) onRename(c.id, t.trim()); }}
            onDelete={() => { if (window.confirm('Delete this conversation?')) onDelete(c.id); }} />
        ))}
      </div>
    </aside>
  );
}

function ConvItem({ c, active, onSelect, onRename, onDelete }) {
  const [hover, setHover] = useState(false);
  return (
    <div onClick={onSelect} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ padding:'9px 10px', borderRadius:'var(--radius-sm)', cursor:'pointer', marginBottom:2,
        background: active ? 'var(--panel-3)' : hover ? 'var(--panel-2)' : 'transparent',
        border: `1px solid ${active ? 'var(--border)' : 'transparent'}`,
        display:'flex', alignItems:'flex-start', justifyContent:'space-between', transition:'background .12s' }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight: active ? 700 : 500, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.title}</div>
        <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{c.model || '—'} · {c.message_count || 0} msgs</div>
      </div>
      {(hover || active) && (
        <div style={{ display:'flex', gap:4, marginLeft:6, flexShrink:0 }}>
          <button onClick={e => { e.stopPropagation(); onRename(); }} style={{ fontSize:12, padding:'2px 5px', borderRadius:4, color:'var(--muted)', background:'var(--panel-3)' }}>✎</button>
          <button onClick={e => { e.stopPropagation(); onDelete(); }} style={{ fontSize:12, padding:'2px 5px', borderRadius:4, color:'var(--error)', background:'var(--panel-3)' }}>✕</button>
        </div>
      )}
    </div>
  );
}
