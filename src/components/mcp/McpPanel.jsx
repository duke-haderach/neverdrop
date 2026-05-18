import React, { useState } from 'react';
import { useMcp } from '../../hooks/useMcp';

const PRESETS = [
  { label:'agent-history-mcp (pip)', name:'agent-history', command:'python3', args:'-m agent_history_mcp', env:'' },
  { label:'agent-history-mcp (uv)',  name:'agent-history', command:'uv',      args:'run python -m agent_history_mcp', env:'' },
  { label:'filesystem MCP',          name:'filesystem',    command:'npx',     args:'@modelcontextprotocol/server-filesystem /path', env:'' },
  { label:'Custom…',                 name:'',              command:'',        args:'', env:'' },
];

const S = {
  input: { width:'100%', background:'var(--panel-2)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'8px 10px', color:'var(--text)', fontSize:12, outline:'none' },
  label: { fontSize:11, color:'var(--muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', display:'block', marginBottom:4 },
};

export function McpPanel({ selectedIds, onToggle }) {
  const { servers, addServer, removeServer, connect, disconnect } = useMcp();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...PRESETS[0] });
  const [err, setErr]   = useState('');
  const [loading, setLoading] = useState('');

  async function handleAdd(e) {
    e.preventDefault(); setErr('');
    let env = {};
    if (form.env.trim()) { try { env = JSON.parse(form.env); } catch { setErr('Env must be valid JSON {}'); return; } }
    const res = await addServer({ name: form.name, command: form.command, args: form.args.trim().split(/\s+/), env, enabled: 1 });
    if (res?.ok) setShowForm(false);
    else setErr(res?.error || 'Failed to add server');
  }

  async function handleConnect(id) {
    setLoading(id); await connect(id); setLoading('');
  }

  return (
    <div style={{ padding:'0 16px 16px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 0 10px', borderBottom:'1px solid var(--border)' }}>
        <span style={{ fontWeight:700, fontSize:13 }}>MCP Servers</span>
        <button onClick={() => setShowForm(s => !s)}
          style={{ fontSize:12, background:'var(--panel-3)', border:'1px solid var(--border)', borderRadius:6, padding:'5px 10px' }}>
          {showForm ? '✕ Close' : '+ Add'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} style={{ paddingTop:12, display:'flex', flexDirection:'column', gap:9, marginBottom:14, borderBottom:'1px solid var(--border)', paddingBottom:14 }}>
          <div>
            <label style={S.label}>Preset</label>
            <select style={S.input} value={form.label} onChange={e => { const p = PRESETS.find(x => x.label===e.target.value)||PRESETS[0]; setForm({...p}); }}>
              {PRESETS.map(p => <option key={p.label}>{p.label}</option>)}
            </select>
          </div>
          {[['Name','name','agent-history'],['Command','command','python3'],['Args (space-separated)','args','-m agent_history_mcp'],['Env (JSON object)','env','{"API_KEY":"val"}']].map(([l,k,ph]) => (
            <div key={k}>
              <label style={S.label}>{l}</label>
              <input style={S.input} value={form[k]} onChange={e => setForm(f => ({...f,[k]:e.target.value}))} placeholder={ph} />
            </div>
          ))}
          {err && <div style={{ fontSize:11, color:'var(--error)' }}>{err}</div>}
          <button style={{ background:'var(--accent)', color:'#fff', border:'none', borderRadius:'var(--radius-sm)', padding:'8px', fontWeight:700 }}>Add server</button>
        </form>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:8, paddingTop:10 }}>
        {servers.length === 0 && (
          <div style={{ color:'var(--faint)', fontSize:12, textAlign:'center', padding:'20px 0', lineHeight:1.6 }}>
            No MCP servers configured.<br/>Add <strong style={{color:'var(--muted)'}}>agent-history-mcp</strong> for long-term memory.
          </div>
        )}
        {servers.map(s => (
          <div key={s.id} style={{ background:'var(--panel-2)', border:`1px solid ${selectedIds?.includes(s.id) ? 'var(--accent)' : 'var(--border)'}`, borderRadius:'var(--radius-sm)', padding:'10px 12px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background: s.connected ? 'var(--success)' : 'var(--faint)', flexShrink:0 }} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:13 }}>{s.name}</div>
                <div style={{ fontSize:11, color:'var(--muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {s.command} {s.args?.join(' ')}
                </div>
              </div>
              <div style={{ display:'flex', gap:5, flexShrink:0 }}>
                {s.connected
                  ? <button onClick={() => disconnect(s.id)} style={{ fontSize:11, background:'var(--panel-3)', border:'1px solid var(--border)', borderRadius:5, padding:'4px 8px', color:'var(--muted)' }}>Disconnect</button>
                  : <button onClick={() => handleConnect(s.id)} disabled={loading===s.id}
                      style={{ fontSize:11, background:'var(--accent)', border:'none', borderRadius:5, padding:'4px 8px', color:'#fff', fontWeight:700, opacity:loading===s.id?0.6:1 }}>
                      {loading===s.id ? '…' : 'Connect'}
                    </button>
                }
                {s.connected && onToggle && (
                  <button onClick={() => onToggle(s.id)}
                    style={{ fontSize:11, background: selectedIds?.includes(s.id) ? 'var(--accent)' : 'var(--panel-3)', border:'1px solid var(--border)', borderRadius:5, padding:'4px 8px', color: selectedIds?.includes(s.id) ? '#fff' : 'var(--muted)', fontWeight:700 }}>
                    {selectedIds?.includes(s.id) ? '✓ Active' : 'Activate'}
                  </button>
                )}
                <button onClick={() => removeServer(s.id)} style={{ fontSize:11, color:'var(--error)', background:'transparent', border:'1px solid var(--border)', borderRadius:5, padding:'4px 7px' }}>✕</button>
              </div>
            </div>
            {s.connected && s.tools?.length > 0 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:8 }}>
                {s.tools.map(t => (
                  <span key={t} style={{ fontSize:11, padding:'2px 7px', borderRadius:999, background:'color-mix(in srgb,var(--accent) 15%,transparent)', color:'var(--accent)', fontFamily:'monospace' }}>{t}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
