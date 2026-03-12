import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatPanel from './components/ChatPanel';
import ProviderModal from './components/ProviderModal';
import PortModal from './components/PortModal';
import Toast from './components/Toast';
import styles from './App.module.css';

export default function App() {
  const [providers, setProviders]               = useState([]);
  const [conversations, setConversations]       = useState([]);
  const [activeConvId, setActiveConvId]         = useState(null);
  const [activeProviderId, setActiveProviderId] = useState(null);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [editingProvider, setEditingProvider]   = useState(null);
  const [portState, setPortState]               = useState(null); // { triggered: 'auto'|'manual', fromId }
  const [toast, setToast]                       = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [updateInfo, setUpdateInfo]             = useState(null); // { version, ready }

  // ── Load initial data ──
  // ── Auto-update listeners ──────────────────────────────────────────────────
  useEffect(() => {
    window.api.updater.onUpdateAvailable(info => {
      setUpdateInfo({ version: info.version, ready: false });
    });
    window.api.updater.onUpdateDownloaded(info => {
      setUpdateInfo({ version: info.version, ready: true });
    });
  }, []);

  useEffect(() => {
    loadProviders();
    loadConversations();
  }, []);

  const loadProviders = async () => {
    const list = await window.api.providers.list();
    setProviders(list);
    // Auto-select first non-exhausted provider
    if (!activeProviderId) {
      const first = list.find(p => !p.exhausted && p.enabled);
      if (first) setActiveProviderId(first.id);
    }
  };

  const loadConversations = async () => {
    const list = await window.api.conversations.list();
    setConversations(list);
  };

  // ── Provider actions ──
  const handleAddProvider = () => {
    setEditingProvider(null);
    setShowProviderModal(true);
  };

  const handleEditProvider = (p) => {
    setEditingProvider(p);
    setShowProviderModal(true);
  };

  const handleProviderSaved = async () => {
    setShowProviderModal(false);
    await loadProviders();
    showToast('Provider saved', 'success');
  };

  const handleDeleteProvider = async (id) => {
    await window.api.providers.delete(id);
    if (activeProviderId === id) setActiveProviderId(null);
    await loadProviders();
    showToast('Provider removed', 'info');
  };

  const handleSelectProvider = (id) => {
    const p = providers.find(x => x.id === id);
    if (p && !p.exhausted && p.enabled) {
      setActiveProviderId(id);
      showToast(`Switched to ${p.name}`, 'success');
    }
  };

  const handleResetUsage = async (id) => {
    await window.api.usage.reset(id);
    await loadProviders();
    showToast('Usage reset', 'success');
  };

  const handleResetAll = async () => {
    await window.api.usage.resetAll();
    await loadProviders();
    showToast('All providers reset', 'success');
  };

  // ── Conversation actions ──
  const handleNewConversation = async () => {
    const conv = await window.api.conversations.create('New Chat');
    await loadConversations();
    setActiveConvId(conv.id);
  };

  const handleSelectConversation = (id) => setActiveConvId(id);

  const handleDeleteConversation = async (id) => {
    await window.api.conversations.delete(id);
    if (activeConvId === id) setActiveConvId(null);
    await loadConversations();
  };

  const handleRenameConversation = async (id, title) => {
    await window.api.conversations.rename(id, title);
    await loadConversations();
  };

  // ── Port actions ──
  const triggerPort = useCallback((triggeredBy = 'manual') => {
    setPortState({ triggered: triggeredBy, fromId: activeProviderId });
  }, [activeProviderId]);

  const handleProviderExhausted = useCallback(async (exhaustedId) => {
    await loadProviders();
    showToast('Provider quota exhausted — port your conversation', 'warn');
    triggerPort('auto');
  }, [triggerPort]);

  const handlePortConfirmed = async ({ toProviderId, strategy }) => {
    setPortState(null);
    setActiveProviderId(toProviderId);
    await loadProviders();
    await loadConversations();
    showToast(`Conversation ported successfully`, 'success');
  };

  // ── Toast ──
  const showToast = (message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
  };

  // ── Render ──
  const activeProvider = providers.find(p => p.id === activeProviderId) || null;

  return (
    <div className={styles.app}>
      <Sidebar
        collapsed={sidebarCollapsed}
        providers={providers}
        conversations={conversations}
        activeConvId={activeConvId}
        activeProviderId={activeProviderId}
        onAddProvider={handleAddProvider}
        onEditProvider={handleEditProvider}
        onDeleteProvider={handleDeleteProvider}
        onSelectProvider={handleSelectProvider}
        onResetUsage={handleResetUsage}
        onResetAll={handleResetAll}
        onNewConversation={handleNewConversation}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onToggle={() => setSidebarCollapsed(v => !v)}
      />

      <ChatPanel
        conversation={conversations.find(c => c.id === activeConvId) || null}
        activeProvider={activeProvider}
        providers={providers}
        onProviderExhausted={handleProviderExhausted}
        onPortRequest={() => triggerPort('manual')}
        onConversationUpdated={loadConversations}
        onNewConversation={handleNewConversation}
        showToast={showToast}
        sidebarCollapsed={sidebarCollapsed}
        onExpandSidebar={() => setSidebarCollapsed(false)}
      />

      {showProviderModal && (
        <ProviderModal
          provider={editingProvider}
          onSave={handleProviderSaved}
          onClose={() => setShowProviderModal(false)}
          showToast={showToast}
        />
      )}

      {portState && (
        <PortModal
          providers={providers}
          fromProviderId={portState.fromId}
          conversationId={activeConvId}
          isAuto={portState.triggered === 'auto'}
          onConfirm={handlePortConfirmed}
          onClose={() => setPortState(null)}
          showToast={showToast}
        />
      )}

      {toast && (
        <Toast key={toast.id} message={toast.message} type={toast.type} onDone={() => setToast(null)} />
      )}
    </div>
  );
}
