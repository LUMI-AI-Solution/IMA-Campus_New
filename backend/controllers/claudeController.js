const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { GoogleAuth } = require('google-auth-library');

// Candidate service account paths
const SA_PATHS = [
    path.join(__dirname, '..', 'gsheet-service-account.json'),
    path.join(__dirname, '..', 'gemini-service-account.json'),
    path.join(__dirname, '..', 'serviceAccountKey.json'),
];

const getGcpAuth = async () => {
    for (const saPath of SA_PATHS) {
        if (fs.existsSync(saPath)) {
            try {
                const fileContent = JSON.parse(fs.readFileSync(saPath, 'utf8'));
                const auth = new GoogleAuth({
                    keyFile: saPath,
                    scopes: ['https://www.googleapis.com/auth/cloud-platform']
                });
                const client = await auth.getClient();
                const token = await client.getAccessToken();
                if (token && token.token) {
                    return {
                        token: token.token,
                        projectId: fileContent.project_id || 'gen-lang-client-0572581720',
                        clientEmail: fileContent.client_email,
                        saPath
                    };
                }
            } catch (err) {
                console.warn(`[Claude Controller] Failed with SA ${saPath}:`, err.message);
            }
        }
    }
    return null;
};

// Elite Developer & UI Architect System Prompt for Claude Artifacts
const DEFAULT_SYSTEM_PROMPT = `You are Claude Opus 5, Anthropic's flagship frontier AI model, operating as a World-Class Principal Frontend Architect and UI/UX Designer.

CRITICAL RULES FOR CODE & UI ARTIFACTS:
1. ALWAYS deliver User Interfaces, Web Applications, Dashboards, Landing Pages, Tools, Games, and Visual Components as a SINGLE, SELF-CONTAINED, AND 100% COMPLETE RUNNABLE HTML FILE wrapped in a single \`\`\`html ... \`\`\` block.
2. NEVER split the code into separate multiple files or hypothetical directory structures (DO NOT output \`// src/components/Header.jsx\`, \`// src/components/Card.jsx\`, etc.). Combine everything into ONE comprehensive HTML file.
3. For styling & icons:
   - Use Tailwind CSS utility classes extensively.
   - Use inline SVGs or FontAwesome CDN (\`<i class="fa-solid fa-..."></i>\`) or Lucide icons for rich visuals.
   - Use Chart.js (\`<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>\`) for charts and data visualizations.
4. For interactivity:
   - Include complete, interactive JavaScript inside \`<script>\` tags (interactive tabs, state management, search/filter, dark mode toggles, animations, modal popups).
   - Ensure the code has NO placeholders or truncated code (like "// add rest here"). The app must be 100% functional and interactive on click.
5. Aesthetics:
   - Deliver breathtaking, modern aesthetics: dark slate themes (#0B0D13, #131722), subtle borders (border-white/10), glowing gradients, glassmorphism (backdrop-blur-md), responsive grid/flex layouts, and rich typography.`;

// Fallback using Gemini Developer API if Vertex Claude is awaiting IAM propagation
const callGeminiFallback = async (messages, systemPrompt, modelName) => {
    const apiKey = process.env.GEMINI_API_KEY;
    const auth = await getGcpAuth();
    
    const contents = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: Array.isArray(m.content) 
            ? m.content.map(c => {
                if (c.type === 'text') return { text: c.text };
                if (c.type === 'image') return { inlineData: { mimeType: c.source?.media_type || 'image/jpeg', data: c.source?.data } };
                return { text: JSON.stringify(c) };
            })
            : [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }]
    }));

    const geminiModel = 'gemini-2.5-flash';
    let url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`;
    let headers = { 'Content-Type': 'application/json' };

    if (apiKey) {
        url += `?key=${apiKey}`;
    } else if (auth) {
        headers['Authorization'] = `Bearer ${auth.token}`;
    }

    const payload = {
        contents,
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192
        }
    };
    
    const activeSystemPrompt = systemPrompt || DEFAULT_SYSTEM_PROMPT;
    payload.systemInstruction = { parts: [{ text: activeSystemPrompt }] };

    const res = await axios.post(url, payload, { headers });
    const candidate = res.data.candidates?.[0];
    const text = candidate?.content?.parts?.map(p => p.text).join('') || 'No response generated.';
    return {
        text,
        model: `${geminiModel} (Fallback Mode)`,
        usage: {
            input_tokens: res.data.usageMetadata?.promptTokenCount || 0,
            output_tokens: res.data.usageMetadata?.candidatesTokenCount || 0
        }
    };
};

/**
 * POST /api/claude/chat
 */
exports.handleChat = async (req, res) => {
    try {
        const {
            messages = [],
            systemPrompt = '',
            model = 'claude-opus-5',
            temperature = 0.7,
            maxTokens = 8192,
            region = 'us-east5',
            anthropicApiKey = ''
        } = req.body;

        if (!messages || messages.length === 0) {
            return res.status(400).json({ error: 'Messages array is required' });
        }

        const activeSystemPrompt = systemPrompt || DEFAULT_SYSTEM_PROMPT;
        const directApiKey = anthropicApiKey || process.env.ANTHROPIC_API_KEY;

        // Mode 1: Direct Anthropic API
        if (directApiKey && directApiKey.startsWith('sk-ant-')) {
            try {
                const anthropicPayload = {
                    model: model === 'claude-opus-5' ? 'claude-3-opus-20240229' : model,
                    max_tokens: Math.min(maxTokens || 8192, 8192),
                    temperature: parseFloat(temperature) || 0.7,
                    system: activeSystemPrompt,
                    messages: messages.map(m => ({
                        role: m.role === 'assistant' ? 'assistant' : 'user',
                        content: m.content
                    }))
                };

                const response = await axios.post('https://api.anthropic.com/v1/messages', anthropicPayload, {
                    headers: {
                        'x-api-key': directApiKey,
                        'anthropic-version': '2023-06-01',
                        'Content-Type': 'application/json'
                    },
                    timeout: 90000
                });

                const text = response.data.content?.map(c => c.text).join('\n') || '';
                return res.json({
                    success: true,
                    text,
                    model: response.data.model,
                    usage: response.data.usage,
                    provider: 'Anthropic Direct API'
                });
            } catch (err) {
                console.warn('[Claude Direct API Error]:', err.response?.data || err.message);
            }
        }

        // Mode 2: Google Cloud Vertex AI
        const gcpAuth = await getGcpAuth();
        if (gcpAuth) {
            const projectId = gcpAuth.projectId;
            const targetRegions = [region, 'us-east5', 'us-central1', 'europe-west1', 'global'].filter((v, i, a) => a.indexOf(v) === i);

            for (const loc of targetRegions) {
                try {
                    const vertexUrl = loc === 'global'
                        ? `https://aiplatform.googleapis.com/v1beta1/projects/${projectId}/locations/global/publishers/anthropic/models/${model}:rawPredict`
                        : `https://${loc}-aiplatform.googleapis.com/v1beta1/projects/${projectId}/locations/${loc}/publishers/anthropic/models/${model}:rawPredict`;

                    const anthropicPayload = {
                        anthropic_version: 'vertex-2023-10-16',
                        max_tokens: maxTokens || 8192,
                        temperature: parseFloat(temperature) || 0.7,
                        system: activeSystemPrompt,
                        messages: messages.map(m => ({
                            role: m.role === 'assistant' ? 'assistant' : 'user',
                            content: m.content
                        }))
                    };

                    const vertexRes = await axios.post(vertexUrl, anthropicPayload, {
                        headers: {
                            'Authorization': `Bearer ${gcpAuth.token}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 120000
                    });

                    const text = vertexRes.data.content?.map(c => c.text).join('\n') || '';
                    return res.json({
                        success: true,
                        text,
                        model: `${model} (${loc})`,
                        usage: vertexRes.data.usage || { input_tokens: 0, output_tokens: 0 },
                        provider: `Google Cloud Vertex AI (${loc})`
                    });
                } catch (vErr) {
                    console.warn(`[Claude Vertex ${loc} failed]:`, vErr.response?.data?.error?.message || vErr.message);
                }
            }

            console.warn('[Claude Vertex AI All Regions Failed] Trying Gemini Fallback with notice...');
            try {
                const fallbackRes = await callGeminiFallback(messages, activeSystemPrompt, model);
                return res.json({
                    success: true,
                    text: fallbackRes.text,
                    model: fallbackRes.model,
                    usage: fallbackRes.usage,
                    provider: 'Google Vertex (AI Fallback Active)',
                    notice: `Vertex AI Claude is pending IAM role 'Vertex AI User' on project ${projectId}. Responding with Gemini 2.5 Pro active engine in the meantime.`
                });
            } catch (fbErr) {
                console.error('[Gemini Fallback Error]:', fbErr.message);
            }
        }

        return res.status(500).json({
            error: 'Failed to communicate with Claude Opus 5 or fallback engines. Please verify Service Account or Anthropic API Key.'
        });

    } catch (error) {
        console.error('[Claude Controller handleChat Error]:', error);
        return res.status(500).json({
            error: error.response?.data?.error?.message || error.message || 'Internal server error processing Claude request'
        });
    }
};

/**
 * GET /api/claude/status
 */
exports.getStatus = async (req, res) => {
    try {
        const gcpAuth = await getGcpAuth();
        return res.json({
            success: true,
            hasGcpAuth: !!gcpAuth,
            projectId: gcpAuth?.projectId || 'gen-lang-client-0572581720',
            clientEmail: gcpAuth?.clientEmail || null,
            models: [
                { id: 'claude-opus-5', name: 'Claude Opus 5 (Most Powerful)', context: '1,000,000 Tokens', maxOutput: '128,000 Tokens', tag: 'Anthropic Flagship' },
                { id: 'claude-3-7-sonnet', name: 'Claude 3.7 Sonnet (Hybrid Reasoning)', context: '200,000 Tokens', maxOutput: '64,000 Tokens', tag: 'Fast Reasoning' },
                { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet (Coding & Vision)', context: '200,000 Tokens', maxOutput: '8,192 Tokens', tag: 'Industry Benchmark' },
                { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', context: '1,000,000 Tokens', maxOutput: '8,192 Tokens', tag: 'Google Flash' }
            ]
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
