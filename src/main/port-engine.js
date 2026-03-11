/**
 * port-engine.js
 *
 * Builds the context handoff when porting a conversation from one LLM to another.
 *
 * Strategy:
 *   'summary'  — AI-generated summary only (compact, good for long convos)
 *   'verbatim' — Full message history injected (verbatim, best for short convos)
 *   'both'     — Summary + last N messages (best fidelity, recommended default)
 */

const LAST_N_MESSAGES = 20; // for 'both' strategy

async function buildPortPrompt({ messages, fromProvider, toProvider, strategy, apiKey }) {
  // Filter out system and port-marker messages for context
  const convoMessages = messages.filter(m => m.role !== 'system' && !m.is_port_marker);

  if (convoMessages.length === 0) {
    return buildBaseSystemPrompt(fromProvider, toProvider, null, []);
  }

  const recentMessages = convoMessages.slice(-LAST_N_MESSAGES);

  let summary = null;

  if (strategy === 'summary' || strategy === 'both') {
    // Use toProvider for summary — fromProvider may be exhausted
    summary = await generateSummary(convoMessages, toProvider, apiKey);
  }

  return buildBaseSystemPrompt(fromProvider, toProvider, summary, 
    strategy === 'verbatim' || strategy === 'both' ? recentMessages : []
  );
}

function buildBaseSystemPrompt(fromProvider, toProvider, summary, recentMessages) {
  const lines = [];

  lines.push(`You are ${toProvider.name} (model: ${toProvider.model}).`);
  lines.push('');
  lines.push('## Context Handoff');
  lines.push(`This conversation was previously being handled by ${fromProvider ? fromProvider.name : 'another AI assistant'}.`);
  lines.push('You are seamlessly continuing it. Maintain the same tone, style, and depth established so far.');
  lines.push('Do NOT mention that you are a different model or that there was a switch unless the user asks.');
  lines.push('');

  if (summary) {
    lines.push('## Conversation Summary');
    lines.push(summary);
    lines.push('');
  }

  if (recentMessages && recentMessages.length > 0) {
    lines.push('## Recent Exchange');
    recentMessages.forEach(m => {
      const role = m.role === 'user' ? 'User' : 'Assistant';
      lines.push(`${role}: ${m.content}`);
    });
    lines.push('');
  }

  lines.push('Continue the conversation naturally from where it left off.');

  return lines.join('\n');
}

async function generateSummary(messages, fromProvider, apiKey) {
  // Build a minimal prompt to summarize the conversation
  const convoText = messages
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');

  const summaryRequest = [
    {
      role: 'system',
      content: 'You are a helpful assistant that summarizes conversations concisely. Focus on: key topics discussed, decisions made, user preferences expressed, tone of conversation, and any open questions. Be concise (max 200 words).'
    },
    {
      role: 'user',
      content: `Summarize this conversation for context handoff:\n\n${convoText}\n\nProvide a concise summary covering: topics, user intent, tone, and any unresolved items.`
    }
  ];

  try {
    const llmRouter = require('./llm-router');
    // Use the from-provider to generate summary if possible
    if (fromProvider && apiKey) {
      const summary = await llmRouter.chat({
        provider: fromProvider,
        apiKey,
        messages: summaryRequest,
      });
      return summary;
    }
  } catch (e) {
    console.warn('[port-engine] Could not generate AI summary, using fallback:', e.message);
  }

  // Fallback: plain text summary of last few exchanges
  return messages
    .slice(-6)
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.slice(0, 200)}${m.content.length > 200 ? '…' : ''}`)
    .join('\n');
}

module.exports = { buildPortPrompt };
