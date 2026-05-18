import React, { useState } from 'react';

const PRESETS = [
  { provider:'openai',           label:'OpenAI',              model:'gpt-4o-mini',              baseUrl:'' },
  { provider:'anthropic',        label:'Anthropic',           model:'claude-3-5-haiku-20241022', baseUrl:'' },
  { provider:'gemini',           label:'Google Gemini',       model:'gemini-1.5-flash',          baseUrl:'' },
  { provider:'groq',             label:'Groq',                model:'llama-3.3-70b-versatile',   baseUrl:'https://api.groq.com/openai/v1' },
  { provider:'deepseek',         label:'DeepSeek',            model:'deepseek-chat',             baseUrl:'https://api.deepseek.com/v1' },
  { provider:'mistral',          label:'Mistral',             model:'mistral-small-latest',      baseUrl:'https://api.mistral.ai/v1' },
  { provider:'cohere',           label:'Cohere',              model:'command-r-plus-08-2024',    baseUrl:'https://api.cohere.ai/v1' },
  { provider:'cerebras',         label:'Cerebras',            model:'llama-3.3-70b',             baseUrl:'https://api.cerebras.ai/v1' },
  { provider:'xai',              label:'xAI Grok',            model:'grok-beta',                 baseUrl:'https://api.x.ai/v1' },
  { provider:'ollama',           label:'Ollama (local)',      model:'llama3.2',                  baseUrl:'http://localhost:11434/v1' },
  { provider:'lmstudio',         label:'LM Studio (local)',   model:'local-model',               baseUrl:'http://localhost:1234/v1' },
  { provider:'openai_compatible',label:'Custom compatible',   model:'',                          baseUrl:'' },
];

const S = {
  input: { width:'100%', background:'var(--panel-2)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'9px 11px', color:'var(--text)', fontSize:13, outline:'none' },
  label: { fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.06em', display:'block', marginBottom:5 },
};

export function ProviderPanel({ providers, selectedId, onSelect, onSave, onDelete }) {
  const [preset,   setPreset]  = useState(PRESETS[0]);
  const [label,    setLabel]   = useState(PRESETS[0].label);
  const [model,    setModel]   = useState(PRESETS[0].model);
  const [baseUrl,  setBaseUrl] = useState(PRESETS[0].baseUrl);
  const [apiKey,   setApiKey]  = useState('');
  const [saving,   setSaving]  = useState(false);
  const [error,    setError]   = useState('');

  function applyPreset(p) { setPreset(p); setLabel(p.label); setModel(p.model); setBaseUrl(p.baseUrl); setApiKey(''); setError(''); }

  async function handleSave(e) {
    e.preventDefault(); setError('');
    if (!label.trim() || !model.trim()) { setError('Label and model are required'); return; }
    setSaving(true);
    const saved = await onSave({ provider: preset.provider, label: label.trim(), model: model.trim(), base_url: baseUrl.trim() || null, apiKey });
    setSaving(false);
    if (saved?.id) { onSelect(saved.id); setApiKey(''); }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ padding:'16px 18px', borderBottom:'1px solid var(--border)', fontWeight:800, fontSize:15 }}>Providers</div>

      {/* Saved list */}
      <div style={{ padding:'10px 12px', borderBottom:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:5 }}>
        {providers.length === 0 && <div style={{ color:'var(--faint)', fontSize:13, padding:'8px 0' }}>No providers saved yet.</div>}
        {providers.map(p => (
          <div key={p.id} onClick={() => onSelect(p.id)}
            style={{ padding:'9px 11px', borderRadius:'var(--radius-sm)', cursor:'pointer',
              background: selectedId===p.id ? 'var(--panel-3)' : 'var(--panel-2)',
              border:`1px solid ${selectedId===p.id ? 'var(--accent)' : 'var(--border)'}`,
              display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontWeight:600, fontSize:13 }}>{p.label}</div>
              <div style={{ fontSize:11, color:'var(--muted)' }}>{p.provider} · {p.model}</div>
            </div>
            <button onClick={e => { e.stopPropagation(); onDelete(p.id); }}
              style={{ fontSize:12, color:'var(--error)', background:'transparent', border:'1px solid var(--border)', borderRadius:4, padding:'3px 7px' }}>✕</button>
          </div>
        ))}
      </div>

      {/* Add form */}
      <div style={{ padding:18, overflowY:'auto', flex:1 }}>
        <div style={{ fontWeight:700, fontSize:13, marginBottom:14 }}>Add provider</div>
        <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div>
            <label style={S.label}>Preset</label>
            <select style={S.input} value={preset.provider} onChange={e => applyPreset(PRESETS.find(p => p.provider===e.target.value)||PRESETS[0])}>
              {PRESETS.map(p => <option key={p.provider} value={p.provider}>{p.label}</option>)}
            </select>
          </div>
          {[['Display name','text',label,setLabel,'e.g. GPT-4o Mini'],
            ['Model','text',model,setModel,'gpt-4o-mini'],
            ['Base URL (optional override)','text',baseUrl,setBaseUrl,'https://api.example.com/v1'],
            ['API key (stored in OS keychain)','password',apiKey,setApiKey,'sk-… (blank for local)']
          ].map(([lbl,type,val,setter,ph]) => (
            <div key={lbl}>
              <label style={S.label}>{lbl}</label>
              <input style={S.input} type={type} value={val} onChange={e => setter(e.target.value)} placeholder={ph} />
            </div>
          ))}
          {error && <div style={{ fontSize:12, color:'var(--error)' }}>{error}</div>}
          <button style={{ background:'var(--accent)', color:'#fff', border:'none', borderRadius:'var(--radius-sm)', padding:'10px', fontWeight:700, opacity:saving?0.6:1 }}>
            {saving ? 'Saving…' : 'Save & select'}
          </button>
        </form>
      </div>
    </div>
  );
}
