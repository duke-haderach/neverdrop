import React, { useState, useEffect } from 'react';
import styles from './Modal.module.css';

// Well-known presets — just for convenience. Users can override everything.
// FREE TIER = genuinely free API with no credit card required
// PAID      = requires billing / credits
const PRESETS = [
  // ── Paid (primary) ──────────────────────────────────────────────────────────
  { label: 'Anthropic (Claude)',   base_url: 'https://api.anthropic.com',                   adapter: 'anthropic', placeholder: 'claude-3-5-haiku-20241022',                    tier: 'paid',    signup: 'https://console.anthropic.com' },
  { label: 'OpenAI (ChatGPT)',     base_url: 'https://api.openai.com/v1',                   adapter: 'openai',    placeholder: 'gpt-4o-mini',                                 tier: 'paid',    signup: 'https://platform.openai.com' },
  { label: 'Google Gemini',        base_url: 'https://generativelanguage.googleapis.com',   adapter: 'gemini',    placeholder: 'gemini-2.0-flash',                            tier: 'paid',    signup: 'https://aistudio.google.com' },
  { label: 'xAI (Grok)',           base_url: 'https://api.x.ai/v1',                         adapter: 'openai',    placeholder: 'grok-2',                                      tier: 'paid',    signup: 'https://console.x.ai' },
  // ── Free tier ────────────────────────────────────────────────────────────────
  { label: 'Groq (FREE)',          base_url: 'https://api.groq.com/openai/v1',              adapter: 'openai',    placeholder: 'llama-3.3-70b-versatile',                     tier: 'free',    signup: 'https://console.groq.com' },
  { label: 'DeepSeek (FREE)',      base_url: 'https://api.deepseek.com/v1',                 adapter: 'openai',    placeholder: 'deepseek-chat',                               tier: 'free',    signup: 'https://platform.deepseek.com' },
  { label: 'Mistral AI (FREE)',    base_url: 'https://api.mistral.ai/v1',                   adapter: 'openai',    placeholder: 'mistral-small-latest',                        tier: 'free',    signup: 'https://console.mistral.ai' },
  { label: 'Cohere (FREE)',        base_url: 'https://api.cohere.com/compatibility/v1',                   adapter: 'openai',    placeholder: 'command-r-plus-08-2024',                      tier: 'free',    signup: 'https://dashboard.cohere.com' },
  { label: 'Cerebras (FREE)',      base_url: 'https://api.cerebras.ai/v1',                  adapter: 'openai',    placeholder: 'llama-3.3-70b',                               tier: 'free',    signup: 'https://cloud.cerebras.ai' },
  { label: 'Perplexity',           base_url: 'https://api.perplexity.ai',                   adapter: 'openai',    placeholder: 'llama-3.1-sonar-small-128k-online',           tier: 'paid',    signup: 'https://www.perplexity.ai/settings/api' },
  { label: 'Together AI',          base_url: 'https://api.together.xyz/v1',                 adapter: 'openai',    placeholder: 'meta-llama/Llama-3-8b-chat-hf',               tier: 'paid',    signup: 'https://api.together.ai' },
  // ── Local (no API key) ───────────────────────────────────────────────────────
  { label: 'Ollama (local)',        base_url: 'http://localhost:11434/v1',                   adapter: 'openai',    placeholder: 'llama3.2',                                    tier: 'local',   signup: 'https://ollama.com' },
  { label: 'LM Studio (local)',     base_url: 'http://localhost:1234/v1',                    adapter: 'openai',    placeholder: 'local-model',                                 tier: 'local',   signup: 'https://lmstudio.ai' },
  { label: 'Custom / Other',        base_url: '',                                            adapter: 'openai',    placeholder: 'https://api.yourprovider.com/v1',             tier: 'custom',  signup: '' },
];

const TIER_BADGE = { free: '🆓', paid: '💳', local: '🖥', custom: '⚙' };
const TIER_COLOR = { free: '#22c55e', paid: '#a78bfa', local: '#38bdf8', custom: '#94a3b8' };

export default function ProviderModal({ provider, onSave, onClose, showToast }) {
  const isEdit = !!provider;

  const [preset, setPreset]         = useState(0);
  const [name, setName]             = useState('');
  const [baseUrl, setBaseUrl]       = useState('');
  const [model, setModel]           = useState('');
  const [adapter, setAdapter]       = useState('openai');
  const [apiKey, setApiKey]         = useState('');
  const [notes, setNotes]           = useState('');
  const [saving, setSaving]         = useState(false);
  const [showKey, setShowKey]       = useState(false);

  useEffect(() => {
    if (provider) {
      setName(provider.name);
      setBaseUrl(provider.base_url);
      setModel(provider.model);
      setAdapter(provider.adapter || 'openai');
      setNotes(provider.notes || '');
      // Load existing key hint
      window.api.keys.get(provider.id).then(k => { if (k) setApiKey('•'.repeat(20)); });
    }
  }, [provider]);

  const applyPreset = (idx) => {
    const p = PRESETS[idx];
    setPreset(idx);
    setAdapter(p.adapter);
    if (p.base_url) setBaseUrl(p.base_url);
    if (!name || name === PRESETS[preset]?.label) setName(p.label !== 'Custom / Other' ? p.label : '');
  };

  const handleSave = async () => {
    if (!name.trim()) { showToast('Name is required', 'warn'); return; }
    if (!baseUrl.trim()) { showToast('Base URL is required', 'warn'); return; }
    if (!model.trim()) { showToast('Model name is required', 'warn'); return; }
    if (!isEdit && !apiKey.trim()) { showToast('API key is required', 'warn'); return; }

    setSaving(true);
    try {
      let savedProvider;
      if (isEdit) {
        savedProvider = await window.api.providers.update({
          id: provider.id,
          name: name.trim(),
          base_url: baseUrl.trim(),
          model: model.trim(),
          adapter,
          quota_daily: provider.quota_daily || 0,
          max_tokens: provider.max_tokens || 2048,
          temperature: provider.temperature != null ? provider.temperature : 0.7,
          notes: notes.trim(),
          enabled: 1,
          reset_at: provider.reset_at || null,
        });
      } else {
        savedProvider = await window.api.providers.add({
          name: name.trim(),
          base_url: baseUrl.trim(),
          model: model.trim(),
          adapter,
          quota_daily: 0,
          max_tokens: 2048,
          temperature: 0.7,
          notes: notes.trim(),
        });
      }

      // Save API key to keychain if changed
      if (apiKey.trim() && !apiKey.startsWith('•')) {
        await window.api.keys.set(savedProvider.id, apiKey.trim());
      }

      onSave();
    } catch (err) {
      showToast(`Error: ${err.message}`, 'danger');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>{isEdit ? 'Edit Provider' : 'Add LLM Provider'}</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {!isEdit && (
          <div className={styles.formGroup}>
            <label>Quick Setup (optional)</label>
            <select value={preset} onChange={e => applyPreset(Number(e.target.value))}>
              {PRESETS.map((p, i) => (
                <option key={i} value={i}>{TIER_BADGE[p.tier]} {p.label}</option>
              ))}
            </select>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'4px'}}>
              <span className={styles.hint}>
                <span style={{color: TIER_COLOR[PRESETS[preset]?.tier], fontWeight:600}}>
                  {PRESETS[preset]?.tier === 'free' ? '🆓 Free API tier — no credit card needed' :
                   PRESETS[preset]?.tier === 'local' ? '🖥 Runs locally — no API key needed' :
                   PRESETS[preset]?.tier === 'paid' ? '💳 Requires billing / credits' :
                   '⚙ Custom provider'}
                </span>
              </span>
              {PRESETS[preset]?.signup && (
                <a href={PRESETS[preset].signup} target="_blank" rel="noreferrer"
                   style={{fontSize:'11px', color:'var(--accent)', textDecoration:'none', whiteSpace:'nowrap'}}>
                  Get API key →
                </a>
              )}
            </div>
          </div>
        )}

        <div className={styles.row}>
          <div className={styles.formGroup}>
            <label>Display Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="My Claude Account" />
          </div>
          <div className={styles.formGroup} style={{width: 130}}>
            <label>Adapter</label>
            <select value={adapter} onChange={e => setAdapter(e.target.value)}>
              <option value="openai">OpenAI-compat</option>
              <option value="anthropic">Anthropic</option>
              <option value="gemini">Gemini</option>
            </select>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label>Base URL *</label>
          <input
            value={baseUrl}
            onChange={e => setBaseUrl(e.target.value)}
            placeholder={PRESETS[preset]?.placeholder?.startsWith('http') ? PRESETS[preset].placeholder : 'https://api.example.com/v1'}
            spellCheck={false}
          />
          <span className={styles.hint}>The API endpoint. Leave /v1 suffix as required by the provider.</span>
        </div>

        <div className={styles.formGroup}>
          <label>Model Name *</label>
          <input
            value={model}
            onChange={e => setModel(e.target.value)}
            placeholder={!PRESETS[preset]?.placeholder?.startsWith('http') ? PRESETS[preset]?.placeholder : 'model-name-here'}
            spellCheck={false}
          />
          <span className={styles.hint}>Exact model string as required by the provider (e.g. gpt-4o, claude-3-5-haiku-20241022)</span>
        </div>

        <div className={styles.formGroup}>
          <label>API Key {isEdit ? '(leave blank to keep existing)' : '*'}</label>
          <div className={styles.keyWrap}>
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder={isEdit ? 'Leave blank to keep existing key' : 'Paste your API key…'}
              spellCheck={false}
            />
            <button className={styles.eyeBtn} onClick={() => setShowKey(v => !v)}>
              {showKey ? '🙈' : '👁'}
            </button>
          </div>
          <span className={styles.hint}>🔒 Stored in your OS keychain — never sent anywhere except directly to the provider API</span>
        </div>


        <div className={styles.formGroup}>
          <label>Notes (optional)</label>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Free tier — resets monthly" />
        </div>

        <div className={styles.modalActions}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Provider'}
          </button>
        </div>
      </div>
    </div>
  );
}
