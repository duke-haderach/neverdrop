import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './ChatPanel.module.css';

export default function ChatPanel({
  conversation, activeProvider, providers,
  onProviderExhausted, onPortRequest,
  onConversationUpdated, onNewConversation, showToast,
  sidebarCollapsed, onExpandSidebar,
}) {
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const bottomRef                 = useRef(null);
  const inputRef                  = useRef(null);

  // Load messages when conversation changes
  useEffect(() => {
    if (!conversation) { setMessages([]); return; }
    window.api.messages.list(conversation.id).then(setMessages);
  }, [conversation?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || loading || !activeProvider || !conversation) return;

    const userContent = input.trim();
    setInput('');
    setLoading(true);

    // Save user message
    const userMsg = await window.api.messages.add({
      conversation_id: conversation.id,
      role: 'user',
      content: userContent,
      provider_id: activeProvider.id,
    });
    setMessages(prev => [...prev, userMsg]);

    // Auto-title conversation on first message
    if (messages.filter(m => m.role === 'user').length === 0) {
      const title = userContent.slice(0, 50) + (userContent.length > 50 ? '…' : '');
      await window.api.conversations.rename(conversation.id, title);
      onConversationUpdated();
    }

    // Build message history for LLM (exclude port markers)
    const history = [
      ...messages.filter(m => !m.is_port_marker),
      { role: 'user', content: userContent },
    ].map(m => ({ role: m.role, content: m.content }));

    try {
      const result = await window.api.llm.chat({
        providerId: activeProvider.id,
        messages: history,
      });

      const assistantMsg = await window.api.messages.add({
        conversation_id: conversation.id,
        role: 'assistant',
        content: result.reply,
        provider_id: activeProvider.id,
        provider_name: activeProvider.name,
        model: activeProvider.model,
      });

      setMessages(prev => [...prev, assistantMsg]);

      // Check if provider just got exhausted
      if (result.provider?.exhausted) {
        onProviderExhausted(activeProvider.id);
      }
    } catch (err) {
      if (err.code === 'QUOTA_EXHAUSTED' || err.message?.includes('QUOTA_EXHAUSTED')) {
        const portMarker = await window.api.messages.add({
          conversation_id: conversation.id,
          role: 'system',
          content: `⚠ ${activeProvider.name} quota exhausted`,
          is_port_marker: true,
        });
        setMessages(prev => [...prev, portMarker]);
        onProviderExhausted(activeProvider.id);
      } else {
        showToast(`Error: ${err.message}`, 'danger');
        console.error(err);
      }
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading, activeProvider, conversation, messages, onProviderExhausted, onConversationUpdated, showToast]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const autoResize = (el) => {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  const canType = !!activeProvider && !activeProvider.exhausted && !!conversation && !loading;
  const canSend = canType && !!input.trim();

  // ── Empty state ──
  if (!conversation) {
    return (
      <div className={styles.panel}>
        {sidebarCollapsed && (
          <button className={styles.expandHandle} onClick={onExpandSidebar} title="Open sidebar">
            ›
          </button>
        )}
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>✦</div>
          <h2>Welcome to NeverDrop</h2>
          <p>Your AI conversations — never lost, never dropped.<br />Configure providers and start chatting.</p>
          <div className={styles.emptyActions}>
            {activeProvider ? (
              <button className={styles.primaryBtn} onClick={onNewConversation}>
                New Conversation
              </button>
            ) : (
              <p className={styles.hintText}>← Add a provider to get started</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      {/* Sidebar expand handle */}
      {sidebarCollapsed && (
        <button className={styles.expandHandle} onClick={onExpandSidebar} title="Open sidebar">
          ›
        </button>
      )}
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          {activeProvider ? (
            <div className={`${styles.providerBadge} ${activeProvider.exhausted ? styles.badgeExhausted : ''}`}>
              <span className={`${styles.statusDot} ${activeProvider.exhausted ? styles.dotExhausted : styles.dotActive}`} />
              <span className={styles.badgeName}>{activeProvider.name}</span>
              <span className={styles.badgeModel}>{activeProvider.model}</span>
              {activeProvider.quota_daily > 0 && (
                <span className={styles.badgeQuota}>
                  {Math.max(0, activeProvider.quota_daily - activeProvider.used_today)} left
                </span>
              )}
            </div>
          ) : (
            <span className={styles.noProvider}>No provider selected</span>
          )}
        </div>
        <div className={styles.toolbarRight}>
          <button
            className={styles.portBtn}
            onClick={onPortRequest}
            disabled={messages.filter(m => !m.is_port_marker).length === 0}
            title="Port conversation to another provider"
          >
            ⇄ Switch Provider
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className={styles.messages}>
        {messages.length === 0 && !loading && (
          <div className={styles.startHint}>
            <span>Start a conversation with {activeProvider?.name || 'an AI'}</span>
          </div>
        )}

        {messages.map((m) => {
          if (m.is_port_marker || m.role === 'system') {
            return (
              <div key={m.id} className={styles.systemMsg}>
                <div className={styles.systemPill}>{m.content}</div>
              </div>
            );
          }

          return (
            <div key={m.id} className={`${styles.message} ${styles[m.role]}`}>
              <div className={styles.avatar}>
                {m.role === 'user'
                  ? 'You'
                  : (m.provider_name || activeProvider?.name || 'AI').slice(0, 2)}
              </div>
              <div className={styles.msgBody}>
                <div className={styles.msgMeta}>
                  {m.role === 'user' ? 'You' : m.provider_name || activeProvider?.name || 'AI'}
                  {m.model && <span className={styles.modelLabel}>{m.model}</span>}
                  <span className={styles.time}>
                    {new Date((m.created_at || '').replace(' ', 'T')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className={styles.bubble}>
                  {m.content.split('\n').map((line, i) => (
                    <React.Fragment key={i}>
                      {line}
                      {i < m.content.split('\n').length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className={`${styles.message} ${styles.assistant}`}>
            <div className={styles.avatar}>
              {(activeProvider?.name || 'AI').slice(0, 2)}
            </div>
            <div className={styles.msgBody}>
              <div className={styles.msgMeta}>{activeProvider?.name || 'AI'}</div>
              <div className={styles.bubble}>
                <div className={styles.typing}>
                  <span /><span /><span />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className={styles.inputArea}>
        {activeProvider?.exhausted && (
          <div className={styles.exhaustedBanner}>
            ⚠ {activeProvider.name} quota exhausted.
            <button onClick={onPortRequest} className={styles.bannerBtn}>Port to another provider →</button>
          </div>
        )}
        <div className={`${styles.inputWrap} ${!canType ? styles.inputDisabled : ''}`}>
          <textarea
            ref={inputRef}
            className={styles.textarea}
            value={input}
            onChange={e => { setInput(e.target.value); autoResize(e.target); }}
            onKeyDown={handleKey}
            placeholder={
              !activeProvider ? 'Select a provider to chat…' :
              activeProvider.exhausted ? 'Provider exhausted — port the conversation to continue' :
              !conversation ? 'Select or create a conversation…' :
              `Message ${activeProvider.name}…`
            }
            disabled={!canType}
            rows={1}
          />
          <button className={styles.sendBtn} onClick={handleSend} disabled={!canSend}>
            ➤
          </button>
        </div>
        <div className={styles.inputHint}>
          Enter to send · Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}
