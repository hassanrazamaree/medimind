// Vercel serverless endpoint for the MediMind chat client.
// Configure GROQ_API_KEY in the hosting provider's environment settings.

const ALLOWED_MODELS = new Set([
    'openai/gpt-oss-20b',
    'openai/gpt-oss-120b',
    'qwen/qwen3.6-27b'
]);

export default async function handler(request, response) {
    const allowedOrigin = process.env.CORS_ORIGIN || '*';
    response.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (request.method === 'OPTIONS') return response.status(204).end();
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        return response.status(500).json({ error: 'Server configuration error' });
    }

    const { messages, model, temperature, max_tokens: maxTokens } = request.body || {};
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 25) {
        return response.status(400).json({ error: 'Invalid messages format' });
    }

    const messagesAreValid = messages.every((message) =>
        ['system', 'user', 'assistant'].includes(message?.role) &&
        typeof message.content === 'string' &&
        message.content.trim().length > 0 &&
        message.content.length <= 10000
    );
    if (!messagesAreValid) {
        return response.status(400).json({ error: 'Invalid message content' });
    }

    try {
        const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: ALLOWED_MODELS.has(model) ? model : 'openai/gpt-oss-20b',
                messages,
                temperature: Math.min(Math.max(Number(temperature) || 0.6, 0), 2),
                max_tokens: Math.min(Math.max(Number(maxTokens) || 600, 1), 4096)
            }),
            signal: AbortSignal.timeout(15000)
        });

        if (!upstream.ok) {
            if (upstream.status === 429) return response.status(429).json({ error: 'Rate limited. Please wait.' });
            if (upstream.status === 401 || upstream.status === 403) return response.status(500).json({ error: 'Invalid API configuration' });
            return response.status(502).json({ error: 'AI service temporarily unavailable' });
        }

        const data = await upstream.json();
        const reply = data?.choices?.[0]?.message?.content?.trim();
        if (!reply) return response.status(502).json({ error: 'Empty response from AI' });
        return response.status(200).json({ reply });
    } catch (error) {
        if (error.name === 'TimeoutError') return response.status(504).json({ error: 'AI service timed out. Please try again.' });
        console.error('Chat proxy error:', error);
        return response.status(500).json({ error: 'Internal server error' });
    }
}
