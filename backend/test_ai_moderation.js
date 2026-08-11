require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const strictModel = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: {
            responseMimeType: "application/json",
        }
    });

    const messages = [
        "hi",
        "paraya",
        "hello",
        "htt",
        "htto",
        "http://google.com",
        "pk"
    ];

    for (let msg of messages) {
        const prompt = `You are a strict automated chat moderator for a student community. 
Your ONLY job is to detect if the user's message violates ANY of the following rules. 

RULES:
1. ANY link/URL (e.g., zoom.us, meet.google, youtube, http, www). ALL links are strictly prohibited.
2. Pornographic, nude, sexual, or highly explicit content.
3. Bad words, profanity, slang, or hate speech in ANY language. 
   CRITICAL: You MUST strictly block these Sinhala/Singlish bad words and their short-forms/variations:
   - "paraya", "huththa", "paka", "wesige putha", "kari", "ponnaya", "hukanna", "pakaya", "balla", "vesi"
   - Short forms: "htt", "htto", "pko", "pco", "pnny", "pnnyo", "pk"

Analyze the message carefully.
Return a valid JSON object EXACTLY like this:
{
  "isViolation": true or false
}

Message to evaluate: "${msg}"`;

        const result = await strictModel.generateContent(prompt);
        const responseText = result.response.text();
        console.log(`Msg: "${msg}" -> Result: ${responseText}`);
    }
}

test();
