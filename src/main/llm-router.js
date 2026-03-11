/**
 * llm-router.js
 *
 * Universal adapter supporting:
 *   - openai   : OpenAI, Mistral, Groq, xAI, Ollama, Together, Perplexity,
 *                Fireworks, Anyscale, LM Studio, and any OpenAI-compatible API
 *   - anthropic: Anthropic Claude (direct SDK)
 *   - gemini   : Google Gemini (direct SDK)
 *
 * Adding a new provider: if it's OpenAI-compatible, just set adapter='openai'
 * with the right base_url. No code changes needed.
 */

async function chat({ provider, apiKey, messages }) {
  switch (provider.adapter) {
    case 'anthropic': return chatAnthropic({ provider, apiKey, messages });
    case 'gemini':    return chatGemini({ provider, apiKey, messages });
    default:          return chatOpenAI({ provider, apiKey, messages });
  }
}

// ── OpenAI-compatible ─────────────────────────────────────────────────────────
async function chatOpenAI({ provider, apiKey, messages }) {
  const OpenAI = require('openai');

  const client = new OpenAI({
    apiKey,
    baseURL: provider.base_url,
    defaultHeaders: provider.extra_headers ? JSON.parse(provider.extra_headers) : {},
  });

  // Filter to roles the API accepts
  const valid = messages.filter(m => ['system', 'user', 'assistant'].includes(m.role));

  // Some providers (Cohere, etc.) don't handle system role in the messages array.
  // Merge all system messages into a system parameter, or prepend to first user message.
  const systemMessages = valid.filter(m => m.role === 'system');
  const nonSystem = valid.filter(m => m.role !== 'system');
  const systemText = systemMessages.map(m => m.content).join('\n\n');

  let filtered;
  if (systemText && nonSystem.length > 0) {
    // Prepend system context to first user message as a safe fallback
    filtered = nonSystem.map((m, i) => {
      if (i === 0 && m.role === 'user') {
        return { role: 'user', content: systemText + '\n\n' + m.content };
      }
      return { role: m.role, content: m.content };
    });
  } else {
    filtered = valid.map(m => ({ role: m.role, content: m.content }));
  }

  const response = await client.chat.completions.create({
    model:       provider.model,
    messages:    filtered,
    max_tokens:  provider.max_tokens || 2048,
    temperature: provider.temperature != null ? provider.temperature : 0.7,
  });

  return response.choices[0].message.content;
}

// ── Anthropic ─────────────────────────────────────────────────────────────────
async function chatAnthropic({ provider, apiKey, messages }) {
  const Anthropic = require('@anthropic-ai/sdk');

  const client = new Anthropic.default({ apiKey });

  // Anthropic separates system from conversation messages
  const systemMsg = messages.find(m => m.role === 'system');
  const conversation = messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role, content: m.content }));

  const response = await client.messages.create({
    model:      provider.model,
    max_tokens: provider.max_tokens || 2048,
    system:     systemMsg ? systemMsg.content : undefined,
    messages:   conversation,
  });

  return response.content[0].text;
}

// ── Google Gemini ─────────────────────────────────────────────────────────────
async function chatGemini({ provider, apiKey, messages }) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: provider.model });

  // Build Gemini-format history (user/model alternating, no system role)
  const systemMsg = messages.find(m => m.role === 'system');
  const conv = messages.filter(m => m.role !== 'system');

  // Last message must be from user
  const lastUser = [...conv].reverse().find(m => m.role === 'user');
  const history = conv
    .filter(m => m !== lastUser)
    .map(m => ({
      role:  m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const chat = model.startChat({
    history,
    generationConfig: { maxOutputTokens: provider.max_tokens || 2048 },
    systemInstruction: systemMsg ? systemMsg.content : undefined,
  });

  const result = await chat.sendMessage(lastUser ? lastUser.content : '');
  return result.response.text();
}

module.exports = { chat };
