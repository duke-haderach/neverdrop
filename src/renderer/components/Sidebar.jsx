import React, { useState } from 'react';
import styles from './Sidebar.module.css';

const QUOTA_COLORS = (pct) =>
  pct > 85 ? 'var(--danger)' : pct > 55 ? 'var(--warn)' : 'var(--success)';

export default function Sidebar({
  collapsed, providers, conversations,
  activeConvId, activeProviderId,
  onAddProvider, onEditProvider, onDeleteProvider,
  onSelectProvider, onResetUsage, onResetAll,
  onNewConversation, onSelectConversation,
  onDeleteConversation, onRenameConversation,
  onToggle,
}) {
  const [tab, setTab] = useState('providers'); // 'providers' | 'chats'
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [hoveredId, setHoveredId] = useState(null);

  const startRename = (conv, e) => {
    e.stopPropagation();
    setRenamingId(conv.id);
    setRenameValue(conv.title);
  };

  const commitRename = (id) => {
    if (renameValue.trim()) onRenameConversation(id, renameValue.trim());
    setRenamingId(null);
  };

  const handleNewChat = () => {
    onNewConversation();
    setTab('chats');
  };

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.logo}>Never<span>Drop</span></span>
        <button className={styles.collapseBtn} onClick={onToggle} title="Toggle sidebar">
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* Tab bar */}
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'providers' ? styles.tabActive : ''}`}
          onClick={() => setTab('providers')}>Providers</button>
        <button className={`${styles.tab} ${tab === 'chats' ? styles.tabActive : ''}`}
          onClick={() => setTab('chats')}>Chats</button>
      </div>

      {/* Providers tab */}
      {tab === 'providers' && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span>Configured ({providers.length})</span>
            <div style={{display:'flex',gap:'4px'}}>
              {providers.some(p => p.exhausted) && (
                <button className={styles.addBtn} onClick={onResetAll} title="Reset all exhausted providers" style={{fontSize:'12px',padding:'2px 6px'}}>↺ All</button>
              )}
              <button className={styles.addBtn} onClick={onAddProvider} title="Add provider">+</button>
            </div>
          </div>
          <button className={styles.newChatBtn} onClick={handleNewChat}>
            ✦ New Chat
          </button>
          <div className={styles.list}>
            {providers.length === 0 && (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>🔌</div>
                <p>No providers yet</p>
                <button className={styles.emptyBtn} onClick={onAddProvider}>Add your first provider</button>
              </div>
            )}
            {providers.map(p => {
              const pct = p.quota_daily > 0 ? Math.min(100, Math.round((p.used_today / p.quota_daily) * 100)) : 0;
              const isActive = p.id === activeProviderId;
              const isExhausted = !!p.exhausted;
              return (
                <div
                  key={p.id}
                  className={`${styles.providerCard} ${isActive ? styles.providerActive : ''} ${isExhausted ? styles.providerExhausted : ''}`}
                  onClick={() => onSelectProvider(p.id)}
                  onMouseEnter={() => setHoveredId(p.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <div className={styles.providerTop}>
                    <div className={styles.providerLeft}>
                      <div className={styles.providerDot} style={{
                        background: isExhausted ? 'var(--danger)' : isActive ? 'var(--success)' : 'var(--muted)'
                      }} />
                      <div className={styles.providerInfo}>
                        <span className={styles.providerName}>{p.name}</span>
                        <span className={styles.providerModel}>{p.model}</span>
                      </div>
                    </div>
                    {hoveredId === p.id && (
                      <div className={styles.providerActions}>
                        <button onClick={e => { e.stopPropagation(); onEditProvider(p); }} title="Edit">✎</button>
                        {isExhausted && (
                          <button onClick={e => { e.stopPropagation(); onResetUsage(p.id); }} title="Reset quota" className={styles.resetBtn}>↺</button>
                        )}
                        <button onClick={e => { e.stopPropagation(); onDeleteProvider(p.id); }} title="Delete" className={styles.deleteBtn}>✕</button>
                      </div>
                    )}
                  </div>

                  {p.quota_daily > 0 && (
                    <div className={styles.quotaWrap}>
                      <div className={styles.quotaLabels}>
                        <span>{isExhausted
                          ? p.reset_at
                            ? `Resets ${new Date(p.reset_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`
                            : 'Exhausted'
                          : `${p.quota_daily - p.used_today} left`}
                        </span>
                        <span>{p.used_today}/{p.quota_daily}</span>
                      </div>
                      <div className={styles.quotaBar}>
                        <div className={styles.quotaFill} style={{
                          width: `${pct}%`,
                          background: QUOTA_COLORS(pct),
                        }} />
                      </div>
                    </div>
                  )}
                  {p.quota_daily === 0 && (
                    <div className={styles.quotaLabels}>
                      <span style={{color:'var(--muted)',fontSize:'11px'}}>Limits auto-detected on first use</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Chats tab */}
      {tab === 'chats' && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span>Conversations</span>
            <button className={styles.addBtn} onClick={handleNewChat} title="New chat">+</button>
          </div>
          <div className={styles.list}>
            {conversations.length === 0 && (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>💬</div>
                <p>No conversations yet</p>
                <button className={styles.emptyBtn} onClick={handleNewChat}>Start a chat</button>
              </div>
            )}
            {conversations.map(c => (
              <div
                key={c.id}
                className={`${styles.convCard} ${c.id === activeConvId ? styles.convActive : ''}`}
                onClick={() => onSelectConversation(c.id)}
                onMouseEnter={() => setHoveredId(c.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {renamingId === c.id ? (
                  <input
                    className={styles.renameInput}
                    value={renameValue}
                    autoFocus
                    onChange={e => setRenameValue(e.target.value)}
                    onBlur={() => commitRename(c.id)}
                    onKeyDown={e => { if (e.key === 'Enter') commitRename(c.id); if (e.key === 'Escape') setRenamingId(null); }}
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <>
                    <span className={styles.convTitle}>{c.title}</span>
                    <span className={styles.convMeta}>{c.message_count || 0} msgs</span>
                    {hoveredId === c.id && (
                      <div className={styles.convActions}>
                        <button onClick={e => startRename(c, e)} title="Rename">✎</button>
                        <button onClick={e => { e.stopPropagation(); onDeleteConversation(c.id); }} className={styles.deleteBtn} title="Delete">✕</button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.footer}>
        <span className={styles.footerText}>Keys stored in OS keychain</span>
        <span className={styles.footerDot}>🔒</span>
      </div>
    </aside>
  );
}
