import React, { useState, useEffect } from 'react';
import './styles/globals.css';
import { useConversations } from './hooks/useConversations';
import { Sidebar }          from './components/sidebar/Sidebar';
import { ChatView }         from './components/chat/ChatView';
import { ProviderPanel }    from './components/settings/ProviderPanel';
import { McpPanel }         from './components/mcp/McpPanel';

export function App() {
  const { conversations, activeId, setActiveId, create, rename, remove } = useConversations();
  const activeConv = conversations.find(c => c.id === activeId) || null;

  const [providers,    setProviders]    = useState([]);
  const [providerId,   setProviderId]   = useState('');
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful assistant.');
  const [mcpIds,       setMcpIds]       = useState([]);
  const [rightTab,     setRightTab]     = useState('providers');

  useEffect(() => {
    window.api.listProviders().then(list => {
      setProviders(list);
      if (!providerId && list[0]) setProviderId(list[0].id);
    });
  }, []);

  async function handleSaveProvider(p) {
    const saved = await window.api.saveProvider(p);
    const list  = await window.api.listProviders();
    setProviders(list);
    setProviderId(saved.id);
    return saved;
  }

  async function handleDeleteProvider(id) {
    await window.api.deleteProvider(id);
    const list = await window.api.listProviders();
    setProviders(list);
    if (providerId === id) setProviderId(list[0]?.id || '');
  }

  async function handleCreate() {
    const p = providers.find(x => x.id === providerId);
    await create({ title: 'New chat', providerId, model: p?.model || null });
  }

  function Tab({ id, label }) {
    const active = rightTab === id;
    return (
      <button onClick={() => setRightTab(id)} style={{
        flex:1, padding:'10px 0', fontWeight: active ? 800 : 600,
        fontSize:12, color: active ? 'var(--text)' : 'var(--muted)',
        background: active ? 'var(--panel-3)' : 'transparent',
        border:'none', borderBottom:`2px solid ${active ? 'var(--accent)' : 'transparent'}`,
        cursor:'pointer', transition:'all .15s',
      }}>{label}</button>
    );
  }

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onCreate={handleCreate}
        onRename={rename}
        onDelete={remove}
      />

      <ChatView
        conversation={activeConv}
        providerId={providerId}
        systemPrompt={systemPrompt}
        mcpServerIds={mcpIds}
      />

      {/* Right panel */}
      <aside style={{ width:320, minWidth:320, background:'var(--panel)', borderLeft:'1px solid var(--border)', display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
        <div style={{ display:'flex', borderBottom:'1px solid var(--border)' }}>
          <Tab id="providers" label="Providers" />
          <Tab id="mcp"       label="MCP" />
          <Tab id="system"    label="System" />
        </div>

        <div style={{ flex:1, overflowY:'auto' }}>
          {rightTab === 'providers' && (
            <ProviderPanel
              providers={providers}
              selectedId={providerId}
              onSelect={setProviderId}
              onSave={handleSaveProvider}
              onDelete={handleDeleteProvider}
            />
          )}
          {rightTab === 'mcp' && (
            <McpPanel
              selectedIds={mcpIds}
              onToggle={id => setMcpIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
            />
          )}
          {rightTab === 'system' && (
            <div style={{ padding:18, display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ fontWeight:700, fontSize:13 }}>System prompt</div>
              <div style={{ fontSize:12, color:'var(--muted)', lineHeight:1.6 }}>
                Injected at the start of every conversation. When MCP context is active it's prepended before this prompt automatically.
              </div>
              <textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)}
                style={{ background:'var(--panel-2)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'10px 12px', color:'var(--text)', fontSize:13, minHeight:200, resize:'vertical', lineHeight:1.6, outline:'none' }}
                onFocus={e => e.target.style.borderColor='var(--accent)'}
                onBlur={e => e.target.style.borderColor='var(--border)'} />
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
