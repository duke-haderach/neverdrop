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
 *   Mistral:   x-ratelimit-limit, x-ratelimit-remaining, x-ratelimit-reset (epoch seconds)
 *   Cohere:    x-trial-endpoint-call-limit, x-trial-endpoint-call-remaining
 *   Cerebras:  x-ratelimit-limit-requests, x-ratelimit-remaining-requests
 *   OpenAI:    x-ratelimit-limit-requests, x-ratelimit-remaining-requests, x-ratelimit-reset-requests
 *   Anthropic: anthropic-ratelimit-requests-limit, anthropic-ratelimit-requests-remaining, anthropic-ratelimit-requests-reset
 */

/**
 * Parse rate limit info from response headers.
 * Returns { limit, remaining, resetAt } or null if no headers found.
 */
function parseRateLimitHeaders(headers) {
  if (!headers) return null;

  // Normalise — headers may be a Headers object or plain object
  const get = (key) => {
    if (typeof headers.get === 'function') return headers.get(key);
    return headers[key] || headers[key.toLowerCase()] || null;
  };

  // ── Cohere trial headers ──────────────────────────────────────────────────
  const cohereLimit     = get('x-trial-endpoint-call-limit') || get('x-endpoint-monthly-call-limit');
  const cohereRemaining = get('x-trial-endpoint-call-remaining');
  if (cohereLimit && cohereRemaining !== null) {
    return {
      limit:     parseInt(cohereLimit),
      remaining: parseInt(cohereRemaining),
      resetAt:   null, // Cohere resets monthly, no header for exact time
      window:    'monthly',
    };
  }

  // ── Anthropic ─────────────────────────────────────────────────────────────
  const anthropicLimit     = get('anthropic-ratelimit-requests-limit');
  const anthropicRemaining = get('anthropic-ratelimit-requests-remaining');
  const anthropicReset     = get('anthropic-ratelimit-requests-reset');
  if (anthropicLimit && anthropicRemaining !== null) {
    return {
      limit:     parseInt(anthropicLimit),
      remaining: parseInt(anthropicRemaining),
      resetAt:   anthropicReset ? new Date(anthropicReset).toISOString() : null,
      window:    'minute',
    };
  }

  // ── OpenAI / Groq / Mistral / Cerebras (all use similar headers) ──────────
  const limit     = get('x-ratelimit-limit-requests')     || get('x-ratelimit-limit');
  const remaining = get('x-ratelimit-remaining-requests') || get('x-ratelimit-remaining');
  const reset     = get('x-ratelimit-reset-requests')     || get('x-ratelimit-reset');

  if (limit && remaining !== null) {
    // reset can be "1m30s", "90s", epoch seconds, or ISO string
    let resetAt = null;
    if (reset) {
      if (/^\d+$/.test(reset)) {
        // epoch seconds (Mistral)
        resetAt = new Date(parseInt(reset) * 1000).toISOString();
      } else if (/^\d{4}-/.test(reset)) {
        // ISO string
        resetAt = new Date(reset).toISOString();
      } else {
        // "1m30s" or "90s" — calculate from now
        const match = reset.match(/(?:(\d+)m)?(?:(\d+)s)?/);
        if (match) {
          const mins = parseInt(match[1] || 0);
          const secs = parseInt(match[2] || 0);
          resetAt = new Date(Date.now() + (mins * 60 + secs) * 1000).toISOString();
        }
      }
    }
    return {
      limit:     parseInt(limit),
      remaining: parseInt(remaining),
      resetAt,
      window:    'minute',
    };
  }

  return null;
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
