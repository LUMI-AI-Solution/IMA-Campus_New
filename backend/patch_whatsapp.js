const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'controllers', 'whatsappCallController.js');
let code = fs.readFileSync(filePath, 'utf8');

const targetUpload = `exports.uploadRecording = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: "No audio file uploaded" });
        }

        const { leadPhone, duration, callId } = req.body;
        // In a real scenario with JWT middleware, we would use req.user.id
        // For testing we'll assume a hardcoded agentId or fetch the first user
        const agentId = req.user ? (req.user.id || req.user.userId) : 1;

        console.log(\`[WhatsApp Call Test] Processing recording for lead: \${leadPhone}, CallID: \${callId}\`);`;

const newUpload = `const processAiAnalysisInBackground = async (filePath, filename, callId, leadPhone, duration, agentId, prompt, reqDirection) => {
    try {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        
        console.log(\`[WhatsApp Call Background] Starting AI analysis for \${filename}\`);
        const base64Data = fs.readFileSync(filePath, { encoding: 'base64' });

        const saPath = require('path').join(__dirname, '..', 'gemini-service-account.json');
        let rawText = "";

        if (fs.existsSync(saPath)) {
            const { GoogleAuth } = require('google-auth-library');
            const axios = require('axios');
            const auth = new GoogleAuth({
                keyFile: saPath,
                scopes: ['https://www.googleapis.com/auth/generative-language']
            });
            const client = await auth.getClient();
            const tokenInfo = await client.getAccessToken();
            const token = tokenInfo.token;

            const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
            const resData = await axios.post(apiUrl, {
                contents: [
                    { 
                        role: "user", 
                        parts: [ 
                            { inlineData: { mimeType: "audio/webm", data: base64Data } },
                            { text: prompt } 
                        ] 
                    }
                ]
            }, {
                headers: {
                    'Authorization': \`Bearer \${token}\`,
                    'Content-Type': 'application/json'
                }
            });
            rawText = resData.data.candidates[0].content.parts[0].text;
        } else {
            const { GoogleGenAI } = require('@google/genai');
            const apiKeySetting = await prisma.appSetting.findUnique({ where: { key: 'GEMINI_API_KEY' } });
            if (!apiKeySetting || !apiKeySetting.value) {
                console.error("GEMINI_API_KEY not configured and Service Account missing");
                return;
            }
            const ai = new GoogleGenAI({ apiKey: apiKeySetting.value });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { inlineData: { mimeType: 'audio/webm', data: base64Data } },
                            { text: prompt }
                        ]
                    }
                ]
            });
            rawText = response.text;
        }

        const jsonText = rawText.replace(/\`\`\`json\\n?|\\n?\`\`\`/g, '').trim();
        let aiData = {};
        try {
            aiData = JSON.parse(jsonText);
        } catch (e) {
            console.error("Failed to parse AI JSON:", jsonText);
        }

        const updateData = {
            aiTone: String(aiData.tone || "Unknown"),
            aiMood: String(aiData.mood || "Unknown"),
            aiSummary: String(aiData.summary || "No summary generated"),
            aiSummarySinhala: String(aiData.summarySinhala || "Sinhala summary not available"),
            aiNotes: Array.isArray(aiData.notes) ? aiData.notes.join('\\n') : String(aiData.notes || "No notes generated"),
            aiVibe: String(aiData.vibe || "Unknown"),
            aiIsGoodCall: typeof aiData.isGoodCall === 'boolean' ? aiData.isGoodCall : null,
            aiStudentQuestions: Array.isArray(aiData.studentQuestions) ? aiData.studentQuestions.join('\\n') : String(aiData.studentQuestions || "None"),
            aiFullAnalysis: aiData.fullAnalysis || "No analysis available",
            transcription: aiData.transcription || "Transcription not available"
        };

        if (callId) {
            await prisma.whatsAppCallRecord.updateMany({
                where: { callId: callId },
                data: updateData
            });
            console.log(\`[WhatsApp Call Background] AI analysis saved for CallID: \${callId}\`);
        } else {
            console.log(\`[WhatsApp Call Background] No callId provided, skipping DB update for AI analysis\`);
        }
        await prisma.$disconnect();
    } catch (error) {
        console.error('Error in background AI analysis:', error);
    }
};

exports.uploadRecording = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: "No audio file uploaded" });
        }

        const { leadPhone, duration, callId } = req.body;
        const agentId = req.user ? (req.user.id || req.user.userId) : 1;

        console.log(\`[WhatsApp Call Test] Processing recording for lead: \${leadPhone}, CallID: \${callId}\`);
        
        const reqDirection = req.body.direction ? String(req.body.direction).toUpperCase() : null;
        
        let record;
        const initialUpdateData = {
            recordingUrl: req.file.filename,
        };
        if (duration) {
            initialUpdateData.duration = parseInt(duration);
        }
        
        if (callId) {
            record = await prisma.whatsAppCallRecord.upsert({
                where: { callId: callId },
                update: initialUpdateData,
                create: { 
                    callId: callId,
                    recordingUrl: req.file.filename,
                    duration: parseInt(duration) || 0,
                    direction: reqDirection || "OUTBOUND",
                    leadPhone: leadPhone ? leadPhone.replace('+', '').trim() : "Unknown",
                    agentId: parseInt(agentId) || 1,
                    status: "COMPLETED"
                }
            });
        }
        
        res.status(200).json({ success: true, record, message: "Recording uploaded, AI analysis running in background" });`;


const targetPromptEnd = `Ensure the output is strictly valid JSON without any markdown formatting block.\`;`;

const originalUploadRestStart = `
        const base64Data = fs.readFileSync(req.file.path, { encoding: 'base64' });`;

// Replace from 'exports.uploadRecording' to the end of the prompt definition, then we skip the rest of the function down to 'res.status(200).json...'
// It's easier to use regex to replace the entire `uploadRecording` body.
// Let's use a simpler string replacement.

const uploadRegex = /exports\.uploadRecording = async \(req, res\) => \{[\s\S]*?res\.status\(200\)\.json\(\{ success: true, record \}\);\n    \} catch \(error\) \{\n        console\.error\('Error in uploadRecording', error\);\n        res\.status\(500\)\.json\(\{ success: false, error: error\.message \}\);\n    \}\n\};/g;

let newFullUpload = newUpload + `
        const prompt = \`You are a Customer Service QA Analyst. Listen to this call recording. The audio is in Sinhala or a mix of Sinhala and English (Singlish).
Do NOT attempt to write a word-for-word transcript, as it leads to inaccuracies. Instead, deeply understand the conversation and provide a highly accurate analysis. 
IMPORTANT: All text fields (tone, mood, vibe, notes, fullAnalysis) MUST be written in BOTH Sinhala and English, separated by a slash (/) or in a bilingual format (e.g. "English Text / සිංහල අදහස").
Provide the summary specifically in two separate fields: one for English and one for Sinhala.

Output a JSON object with the following fields:
{
  "tone": "Brief description of the conversation tone in both English and Sinhala (e.g., Professional / වෘත්තීය, Friendly / මිත්‍රශීලී)",
  "mood": "Brief description of the customer's mood in both English and Sinhala (e.g., Happy / සතුටුයි, Confused / පැටලිලි සහගතයි)",
  "vibe": "The overall vibe of the call in both English and Sinhala (e.g., Positive / ධනාත්මක, Relaxed / සැහැල්ලු)",
  "isGoodCall": boolean (true if it was a successful, polite, or productive call, false otherwise),
  "studentQuestions": "List of questions the student asked in both languages. If none, state 'None / ප්‍රශ්න නැත'",
  "fullAnalysis": "A comprehensive analysis of the call, including how the agent handled it and the overall outcome, in both languages.",
  "summary": "A concise 2-3 sentence summary of the call in strictly English",
  "summarySinhala": "A concise 2-3 sentence summary of the call in strictly Sinhala",
  "notes": "Bullet points of key topics discussed, agreements made, or next steps in both languages"
}
Ensure the output is strictly valid JSON without any markdown formatting block.\`;

        processAiAnalysisInBackground(req.file.path, req.file.filename, callId, leadPhone, duration, agentId, prompt, reqDirection);

    } catch (error) {
        console.error('Error in uploadRecording', error);
        res.status(500).json({ success: false, error: error.message });
    }
};`;

code = code.replace(uploadRegex, newFullUpload);

// Fix getRecording
const getRecTarget = `const filePath = require('path').join(__dirname, '..', 'uploads', safeFilename);`;
const getRecNew = `const filePath = require('path').join(__dirname, '..', '..', 'storage', 'recordings', safeFilename);`;

code = code.replace(getRecTarget, getRecNew);

fs.writeFileSync(filePath, code);
console.log("Successfully patched whatsappCallController.js");
