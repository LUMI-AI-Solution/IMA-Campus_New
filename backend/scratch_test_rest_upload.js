const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function testUpload() {
    try {
        const saPath = path.join(__dirname, 'gemini-service-account.json');
        const auth = new GoogleAuth({
            keyFile: saPath,
            scopes: ['https://www.googleapis.com/auth/generative-language']
        });
        const client = await auth.getClient();
        const tokenInfo = await client.getAccessToken();
        const token = tokenInfo.token;

        // Create a dummy text file to test upload
        const testFilePath = path.join(__dirname, 'test_upload.txt');
        fs.writeFileSync(testFilePath, "Hello world, this is a test video transcription request!");
        const numBytes = fs.statSync(testFilePath).size;

        console.log("Starting upload request...");
        const initRes = await axios.post(
            'https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=resumable',
            { file: { displayName: 'test_upload.txt' } },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Goog-Upload-Protocol': 'resumable',
                    'X-Goog-Upload-Command': 'start',
                    'X-Goog-Upload-Header-Content-Length': numBytes,
                    'X-Goog-Upload-Header-Content-Type': 'text/plain',
                    'Content-Type': 'application/json'
                }
            }
        );

        const uploadUrl = initRes.headers['x-goog-upload-url'];
        console.log("Upload URL received:", uploadUrl);

        console.log("Uploading bytes...");
        const uploadRes = await axios.put(uploadUrl, fs.readFileSync(testFilePath), {
            headers: {
                'Content-Length': numBytes,
                'X-Goog-Upload-Offset': 0,
                'X-Goog-Upload-Command': 'upload, finalize'
            }
        });

        console.log("Upload result:", uploadRes.data);
        const fileUri = uploadRes.data.file.uri;

        console.log("Generating content...");
        const generateRes = await axios.post(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
            {
                contents: [
                    { role: "user", parts: [ { text: "Summarize this file:" }, { fileData: { fileUri, mimeType: 'text/plain' } } ] }
                ]
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log("Generation result:", generateRes.data.candidates[0].content.parts[0].text);

    } catch (e) {
        console.error("Error:", e.response ? JSON.stringify(e.response.data, null, 2) : e.message);
    }
}

testUpload();
