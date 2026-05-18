const { getApiKey } = require('../ipc/providers');

async function buildAdapter(providerRow) {
  const apiKey = await getApiKey(providerRow.id);
  const baseURL = providerRow.base_url || undefined;

  switch (providerRow.provider) {
    case 'anthropic': {
      const Anthropic = require('@anthropic-ai/sdk');
      const client = new Anthropic.default({ apiKey });
      return {
        async streamChat(messages, systemPrompt, onToken) {
          const sysMsg = systemPrompt ? [{ role: 'user', content: systemPrompt }, { role: 'assistant', content: 'Understood.' }] : [];
          const allMsgs = [...sysMsg, ...messages];
          let output = '', tokensIn = 0, tokensOut = 0;
          const stream = await client.messages.stream({
            model: providerRow.model,
            max_tokens: 8096,
            messages: allMsgs,
          });
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
              output += chunk.delta.text;
              onToken(chunk.delta.text);
            }
            if (chunk.type === 'message_delta') {
              tokensOut = chunk.usage?.output_tokens || 0;
            }
            if (chunk.type === 'message_start') {
              tokensIn = chunk.message?.usage?.input_tokens || 0;
            }
          }
          return { output, tokensIn, tokensOut };
        }
      };
    }

    case 'gemini': {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: providerRow.model });
      return {
        async streamChat(messages, systemPrompt, onToken) {
          const history = messages.slice(0, -1).map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          }));
          const lastMsg = messages[messages.length - 1]?.content || '';
          const chat = model.startChat({ history, systemInstruction: systemPrompt || undefined });
          const result = await chat.sendMessageStream(lastMsg);
          let output = '', tokensIn = 0, tokensOut = 0;
          for await (const chunk of result.stream) {
            const text = chunk.text();
            output += text;
            onToken(text);
          }
          const meta = (await result.response).usageMetadata;
          tokensIn = meta?.promptTokenCount || 0;
          tokensOut = meta?.candidatesTokenCount || 0;
          return { output, tokensIn, tokensOut };
        }
      };
    }

    default: {
      // OpenAI-compatible: openai, groq, deepseek, mistral, cohere, cerebras, xai, ollama, lmstudio, openai_compatible
      const OpenAI = require('openai');
      const client = new OpenAI.default({ apiKey: apiKey || 'ollama', baseURL });
      return {
        async streamChat(messages, systemPrompt, onToken) {
          const allMsgs = systemPrompt
            ? [{ role: 'system', content: systemPrompt }, ...messages]
            : messages;
          const stream = await client.chat.completions.create({
            model: providerRow.model,
            messages: allMsgs,
            stream: true,
          });
          let output = '', tokensIn = 0, tokensOut = 0;
          for await (const chunk of stream) {
            const text = chunk.choices?.[0]?.delta?.content || '';
            if (text) { output += text; onToken(text); }
            if (chunk.usage) {
              tokensIn = chunk.usage.prompt_tokens || 0;
              tokensOut = chunk.usage.completion_tokens || 0;
            }
          }
          return { output, tokensIn, tokensOut };
        }
      };
    }
  }
}

module.exports = { buildAdapter };
