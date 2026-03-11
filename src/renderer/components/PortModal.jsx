import React, { useState } from 'react';
import styles from './Modal.module.css';

const STRATEGIES = [
  { value: 'both',     label: 'Summary + Recent (Recommended)', desc: 'AI-generated summary + last 20 messages. Best fidelity.' },
  { value: 'summary',  label: 'Summary Only',                   desc: 'Compact. Great for long conversations.' },
  { value: 'verbatim', label: 'Full History',                   desc: 'Injects all messages verbatim. Best for short convos.' },
];

export default function PortModal({
  providers, fromProviderId, conversationId,
  isAuto, onConfirm, onClose, showToast,
}) {
  const [selectedId, setSelectedId]     = useState(null);
  const [strategy, setStrategy]         = useState('both');
  const [porting, setPorting]           = useState(false);

  const available = providers.filter(p => p.id !== fromProviderId && !p.exhausted && p.enabled);
  const exhausted = providers.filter(p => p.id !== fromProviderId && (p.exhausted || !p.enabled));

  const handleConfirm = async () => {
    if (!selectedId) { showToast('Select a provider to continue', 'warn'); return; }
    setPorting(true);
    try {
      // Build port context prompt
      const portPrompt = await window.api.llm.port({
        fromProviderId,
        toProviderId: selectedId,
        conversationId,
        strategy,
      });

      // Save port marker message
      await window.api.messages.add({
        conversation_id: conversationId,
        role: 'system',
        content: `⇄ Ported to ${providers.find(p => p.id === selectedId)?.name}`,
        is_port_marker: true,
      });

      // Inject port context as first system message for new provider
      await window.api.messages.add({
        conversation_id: conversationId,
        role: 'system',
        content: portPrompt,
        provider_id: selectedId,
        is_port_marker: false,
      });

      onConfirm({ toProviderId: selectedId, strategy });
    } catch (err) {
      showToast(`Port failed: ${err.message}`, 'danger');
    } finally {
      setPorting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && !isAuto && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>{isAuto ? '⚠ Quota Exhausted' : '⇄ Port Conversation'}</h3>
          {!isAuto && <button className={styles.closeBtn} onClick={onClose}>✕</button>}
        </div>

        <p className={styles.portDesc}>
          {isAuto
            ? 'This provider has run out of quota. Choose another to continue seamlessly — your full conversation context will be carried over.'
            : 'Switch to a different LLM. Your conversation context will be injected so the new model continues naturally.'}
        </p>

        {/* Available providers */}
        <div className={styles.formGroup}>
          <label>Continue with</label>
          {available.length === 0 ? (
            <div className={styles.noProviders}>
              No available providers. Add more in the sidebar.
            </div>
          ) : (
            <div className={styles.providerGrid}>
              {available.map(p => (
                <div
                  key={p.id}
                  className={`${styles.providerChoice} ${selectedId === p.id ? styles.choiceSelected : ''}`}
                  onClick={() => setSelectedId(p.id)}
                >
                  <div className={styles.choiceName}>{p.name}</div>
                  <div className={styles.choiceModel}>{p.model}</div>
                  {p.quota_daily > 0 && (
                    <div className={styles.choiceQuota}>
                      {Math.max(0, p.quota_daily - p.used_today)} msgs left
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {exhausted.length > 0 && (
          <div className={styles.exhaustedList}>
            <span>Unavailable: </span>
            {exhausted.map(p => (
              <span key={p.id} className={styles.exhaustedChip}>{p.name} (exhausted)</span>
            ))}
          </div>
        )}

        {/* Strategy */}
        <div className={styles.formGroup}>
          <label>Context Porting Strategy</label>
          <div className={styles.strategyList}>
            {STRATEGIES.map(s => (
              <div
                key={s.value}
                className={`${styles.strategyItem} ${strategy === s.value ? styles.strategySelected : ''}`}
                onClick={() => setStrategy(s.value)}
              >
                <div className={styles.strategyLabel}>
                  <span className={styles.strategyRadio}>{strategy === s.value ? '●' : '○'}</span>
                  {s.label}
                </div>
                <div className={styles.strategyDesc}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.modalActions}>
          {!isAuto && <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>}
          <button
            className={styles.saveBtn}
            onClick={handleConfirm}
            disabled={!selectedId || porting || available.length === 0}
          >
            {porting ? 'Porting…' : 'Continue Here →'}
          </button>
        </div>
      </div>
    </div>
  );
}
