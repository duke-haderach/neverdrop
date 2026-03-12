/**
 * llm-router.js
 *
 * Universal adapter supporting:
 *   - openai   : OpenAI, Mistral, Groq, xAI, Ollama, Together, Perplexity,
 *                Fireworks, Anyscale, LM Studio, and any OpenAI-compatible API
 *   - anthropic: Anthropic Claude (direct SDK)
 *   - gemini   : Google Gemini (direct SDK)
 *
 * Returns { reply, quotaInfo } where quotaInfo contains parsed rate limit headers.
 *
 * Header mapping by provider:
 *   Groq:      x-ratelimit-limit-requests, x-ratelimit-remaining-requests, x-ratelimit-reset-requests
 *   Mistral:   x-ratelimit-limit-req-minute, x-ratelimit-remaining-req-minute (per minute)
 *   Cohere:    x-trial-endpoint-call-limit, x-trial-endpoint-call-remaining
 *   Cerebras:  x-ratelimit-limit-requests, x-ratelimit-remaining-requests
 *   OpenAI:    x-ratelimit-limit-requests, x-ratelimit-remaining-requests, x-ratelimit-reset-requests
 *   Anthropic: anthropic-ratelimit-requests-limit, anthropic-ratelimit-requests-remaining, anthropic-ratelimit-requests-reset
 */

/**
 * Dynamically parse rate limit info from ANY provider's response headers.
 * Scans all headers and scores matches rather than hardcoding header names.
 * This handles any provider variation without needing per-provider rules.
 */
function parseRateLimitHeaders(headers) {
  if (!headers) return null;

  // Collect all headers into a plain object
  const all = {};
  if (typeof headers.forEach === 'function') {
    headers.forEach((value, key) => { all[key.toLowerCase()] = value; });
  } else {
    Object.keys(headers).forEach(k => { all[k.toLowerCase()] = headers[k]; });
  }

  // Log for debugging (only rate-relevant headers)
  const relevant = Object.entries(all).filter(([k]) =>
    k.includes('rate') || k.includes('limit') || k.includes('remaining') ||
    k.includes('retry') || k.includes('reset') || k.includes('trial') ||
    k.includes('quota') || k.includes('usage')
  );
  if (relevant.length > 0) {
    console.log('[NeverDrop] Rate headers:', Object.fromEntries(relevant));
  }

  // ── Helper: find best matching header by keyword priority ─────────────────
  const find = (...keywords) => {
    // Try exact combos first (most specific to least specific)
    for (const kw of keywords) {
      const key = Object.keys(all).find(k => k === kw);
      if (key && all[key] !== undefined) return all[key];
    }
    // Then partial match in priority order
    for (const kw of keywords) {
      const key = Object.keys(all).find(k => k.includes(kw));
      if (key && all[key] !== undefined) return all[key];
    }
    return null;
  };

  // ── Find LIMIT: how many requests allowed in this window ──────────────────
  // Priority: per-minute request limit > daily > generic limit
  const limitRaw =
    find('ratelimit-limit-req-minute', 'ratelimit-limit-requests', 'ratelimit-limit-req',
         'trial-endpoint-call-limit', 'endpoint-monthly-call-limit',
         'ratelimit-limit-rpm', 'ratelimit-limit') ||
    find('x-limit-req', 'limit-req', 'req-limit');

  // ── Find REMAINING: how many left ─────────────────────────────────────────
  const remainingRaw =
    find('ratelimit-remaining-req-minute', 'ratelimit-remaining-requests', 'ratelimit-remaining-req',
         'trial-endpoint-call-remaining', 'endpoint-monthly-call-remaining',
         'ratelimit-remaining-rpm', 'ratelimit-remaining') ||
    find('x-remaining-req', 'remaining-req', 'req-remaining');

  // ── Find RESET: when the window resets ────────────────────────────────────
  const resetRaw =
    find('ratelimit-reset-requests', 'ratelimit-reset-req-minute', 'ratelimit-reset-req',
         'ratelimit-reset', 'retry-after', 'x-retry-after');

  // Nothing useful found
  if (limitRaw === null && remainingRaw === null) return null;

  const limit     = limitRaw     != null ? parseInt(limitRaw)     : null;
  const remaining = remainingRaw != null ? parseInt(remainingRaw) : null;

  // ── Parse reset time into ISO string ─────────────────────────────────────
  let resetAt = null;
  if (resetRaw) {
    const raw = String(resetRaw).trim();
    if (/^\d{4}-/.test(raw)) {
      resetAt = new Date(raw).toISOString();                       // ISO string
    } else if (/^\d{10,}$/.test(raw)) {
      resetAt = new Date(parseInt(raw) * 1000).toISOString();      // epoch seconds
    } else if (/^\d+$/.test(raw)) {
      resetAt = new Date(Date.now() + parseInt(raw) * 1000).toISOString(); // retry-after seconds
    } else {
      // "1m30s" or "90s" format
      const m = raw.match(/(?:(\d+)m)?(?:(\d+(?:\.\d+)?)s)?/);
      if (m && (m[1] || m[2])) {
        const ms = ((parseInt(m[1] || 0) * 60) + parseFloat(m[2] || 0)) * 1000;
        resetAt = new Date(Date.now() + ms).toISOString();
      }
    }
  }

  return { limit, remaining, resetAt };
}


async function chat({ provider, apiKey, messages }) {
  switch (provider.adapter) {
    case 'anthropic': return chatAnthropic({ provider, apiKey, messages });
    case 'gemini':    return chatGemini({ provider, apiKey, messages });
    default:          return chatOpenAI({ provider, apiKey, messages });
  }
}

// ── OpenAI-compatible ─────────────────────────────────────────────────────────
async function chatOpenAI({ provider, apiKey, messages }) {
  // Use fetch directly so we can access response headers
  const valid = messages.filter(m => ['system', 'user', 'assistant'].includes(m.role));
  const systemMessages = valid.filter(m => m.role === 'system');
  const nonSystem = valid.filter(m => m.role !== 'system');
  const systemText = systemMessages.map(m => m.content).join('\n\n');

  let filtered;
  if (systemText && nonSystem.length > 0) {
    filtered = nonSystem.map((m, i) => {
      if (i === 0 && m.role === 'user') {
        return { role: 'user', content: systemText + '\n\n' + m.content };
      }
      return { role: m.role, content: m.content };
    });
  } else {
    filtered = valid.map(m => ({ role: m.role, content: m.content }));
  }

  const baseURL = provider.base_url.replace(/\/$/, '');
  const url = `${baseURL}/chat/completions`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      ...(provider.extra_headers ? JSON.parse(provider.extra_headers) : {}),
    },
    body: JSON.stringify({
      model:       provider.model,
      messages:    filtered,
      max_tokens:  provider.max_tokens || 2048,
      temperature: provider.temperature != null ? provider.temperature : 0.7,
    }),
  });

  const quotaInfo = parseRateLimitHeaders(res.headers);

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    const error = new Error(err?.error?.message || `${res.status} ${res.statusText}`);
    error.status = res.status;
    throw error;
  }

  const data = await res.json();
  const reply = data.choices[0].message.content;

  return { reply, quotaInfo };
}

// ── Anthropic ─────────────────────────────────────────────────────────────────
async function chatAnthropic({ provider, apiKey, messages }) {
  const systemMsg    = messages.find(m => m.role === 'system');
  const conversation = messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role, content: m.content }));

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      provider.model,
      max_tokens: provider.max_tokens || 2048,
      system:     systemMsg ? systemMsg.content : undefined,
      messages:   conversation,
    }),
  });

  const quotaInfo = parseRateLimitHeaders(res.headers);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(err?.error?.message || `${res.status} ${res.statusText}`);
    error.status = res.status;
    throw error;
  }

  const data = await res.json();
  return { reply: data.content[0].text, quotaInfo };
}

// ── Google Gemini ─────────────────────────────────────────────────────────────
async function chatGemini({ provider, apiKey, messages }) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);

  const modelName = provider.model.trim().toLowerCase().replace(/\s+/g, '-');
  const model = genAI.getGenerativeModel({ model: modelName });

  const systemMsg = messages.find(m => m.role === 'system');
  const conv      = messages.filter(m => m.role !== 'system');
  const lastUser  = [...conv].reverse().find(m => m.role === 'user');
  const history   = conv
    .filter(m => m !== lastUser)
    .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));

  const chat = model.startChat({
    history,
    generationConfig: { maxOutputTokens: provider.max_tokens || 2048 },
    systemInstruction: systemMsg ? systemMsg.content : undefined,
  });

  const result = await chat.sendMessage(lastUser ? lastUser.content : '');
  // Gemini SDK doesn't expose raw headers, no quota info available
  return { reply: result.response.text(), quotaInfo: null };
}

module.exports = { chat, parseRateLimitHeaders };
