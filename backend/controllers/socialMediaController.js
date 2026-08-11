const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

exports.uploadAndTranscribe = async (req, res) => {
    let tempAudioPath = null;
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No video file uploaded' });
        }

        const videoPath = req.file.path;
        const videoUrl = `/uploads/social-media/${req.file.filename}`;
        
        console.log(`[Social Media] Processing uploaded file: ${videoPath}`);
        
        // 1. Extract audio track from video to dramatically speed up upload and AI transcription
        tempAudioPath = `${videoPath}_temp.mp3`;
        let fileToUpload = videoPath;
        let uploadMimeType = req.file.mimetype || 'video/mp4';

        try {
            console.log(`[Social Media] Extracting audio with ffmpeg...`);
            await new Promise((resolve, reject) => {
                ffmpeg(videoPath)
                    .noVideo()
                    .audioCodec('libmp3lame')
                    .audioBitrate('64k')
                    .save(tempAudioPath)
                    .on('end', () => resolve(tempAudioPath))
                    .on('error', (err) => reject(err));
            });

            if (fs.existsSync(tempAudioPath) && fs.statSync(tempAudioPath).size > 0) {
                fileToUpload = tempAudioPath;
                uploadMimeType = 'audio/mp3';
                console.log(`[Social Media] Audio extracted successfully. Size: ${fs.statSync(tempAudioPath).size} bytes.`);
            }
        } catch (ffmpegErr) {
            console.warn('[Social Media] Audio extraction failed or video has no audio, falling back to original file:', ffmpegErr.message);
            fileToUpload = videoPath;
        }

        const numBytes = fs.statSync(fileToUpload).size;

        console.log(`[Social Media] Using Service Account for Gemini auth...`);
        const { GoogleAuth } = require('google-auth-library');
        const axios = require('axios');
        
        const saPath = path.join(__dirname, '..', 'gemini-service-account.json');
        if (!fs.existsSync(saPath)) {
            return res.status(500).json({ error: 'Service account JSON not found' });
        }
        
        const auth = new GoogleAuth({
            keyFile: saPath,
            scopes: ['https://www.googleapis.com/auth/generative-language']
        });
        const client = await auth.getClient();
        const tokenInfo = await client.getAccessToken();
        const token = tokenInfo.token;

        console.log(`[Social Media] Starting resumable file upload for ${numBytes} bytes...`);
        const initRes = await axios.post(
            'https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=resumable',
            { file: { displayName: path.basename(fileToUpload) } },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Goog-Upload-Protocol': 'resumable',
                    'X-Goog-Upload-Command': 'start',
                    'X-Goog-Upload-Header-Content-Length': numBytes,
                    'X-Goog-Upload-Header-Content-Type': uploadMimeType,
                    'Content-Type': 'application/json'
                }
            }
        );

        const uploadUrl = initRes.headers['x-goog-upload-url'];
        console.log(`[Social Media] Uploading bytes to Gemini...`);
        
        const uploadRes = await axios.put(uploadUrl, fs.readFileSync(fileToUpload), {
            headers: {
                'Content-Length': numBytes,
                'X-Goog-Upload-Offset': 0,
                'X-Goog-Upload-Command': 'upload, finalize'
            },
            maxBodyLength: Infinity,
            maxContentLength: Infinity
        });

        const fileUri = uploadRes.data.file.uri;
        const fileName = uploadRes.data.file.name;
        console.log(`[Social Media] File uploaded successfully. URI: ${fileUri}`);

        // Wait for processing on Gemini side
        console.log(`[Social Media] Waiting for media processing...`);
        let isReady = false;
        for (let i = 0; i < 120; i++) {
            const checkRes = await axios.get(`https://generativelanguage.googleapis.com/v1beta/${fileName}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const state = checkRes.data.state;
            if (state === 'ACTIVE') {
                isReady = true;
                break;
            }
            if (state === 'FAILED') {
                throw new Error('Gemini failed to process the uploaded media file.');
            }
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        if (!isReady) {
            throw new Error('Media processing timed out.');
        }

        console.log(`[Social Media] Transcribing media with Gemini AI (Sinhala)...`);
        
        const prompt = `Listen to this Sinhala audio/video and transcribe the speech into text. 
CRITICAL: You MUST output word-by-word timestamps so we can animate each word individually.
Do NOT output JSON. Do NOT group words. Output a simple plain text list where each line represents exactly one word in this exact format:
start_time|end_time|word

Example:
0.5|0.8|මම
0.9|1.2|ගෙදර

Only output the raw list. No markdown formatting, no backticks, no extra text.`;

        const generateRes = await axios.post(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
            {
                contents: [
                    { 
                        role: "user", 
                        parts: [
                            { text: prompt },
                            { fileData: { fileUri, mimeType: uploadMimeType } }
                        ]
                    }
                ],
                generationConfig: {
                    responseMimeType: "text/plain"
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const responseText = generateRes.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        // Parse the pipe-separated text into the required JSON array format
        let captions = [];
        let idCounter = 1;
        
        responseText.split('\n').forEach(line => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return;
            
            const parts = trimmedLine.split('|');
            if (parts.length >= 3) {
                const start = parseFloat(parts[0]);
                const end = parseFloat(parts[1]);
                const text = parts.slice(2).join('|').trim(); // In case word somehow has a pipe
                
                if (!isNaN(start) && !isNaN(end) && text) {
                    captions.push({
                        id: idCounter++,
                        start,
                        end,
                        text
                    });
                }
            }
        });

        console.log(`[Social Media] Generated ${captions.length} caption blocks.`);
        
        // Clean up the file from Gemini
        try {
            await axios.delete(`https://generativelanguage.googleapis.com/v1beta/${fileName}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log('[Social Media] Cleaned up file from Gemini.');
        } catch (cleanupErr) {
            console.error('[Social Media] Failed to clean up file from Gemini:', cleanupErr.response ? cleanupErr.response.data : cleanupErr.message);
        }

        res.status(200).json({ 
            videoUrl, 
            videoPath, 
            captions,
            message: "Upload and Transcription successful"
        });

    } catch (e) {
        console.error('[Social Media] Error in uploadAndTranscribe:', e.response ? e.response.data : e.message);
        res.status(500).json({ error: "Failed to process video and generate captions." });
    } finally {
        if (tempAudioPath && fs.existsSync(tempAudioPath)) {
            try { fs.unlinkSync(tempAudioPath); } catch (_) {}
        }
    }
};


// Helper to convert #RRGGBB to ASS color &H00BBGGRR
function hexToAssColor(hex) {
    if (!hex) return '&H00FFFFFF';
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const r = hex.substring(0, 2);
    const g = hex.substring(2, 4);
    const b = hex.substring(4, 6);
    return `&H00${b}${g}${r}`;
}

// Format seconds to ASS time format: h:mm:ss.cs (cs = centiseconds)
function formatAssTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const cs = Math.floor((seconds % 1) * 100);
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
}

exports.exportVideo = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No video file provided' });
        }

        const captions = JSON.parse(req.body.captions || '[]');
        const styles = JSON.parse(req.body.styles || '{}');
        
        const videoPath = req.file.path;
        const filenameWithoutExt = req.file.filename.split('.').slice(0, -1).join('.');
        const outputPath = path.join(__dirname, `../public/uploads/social-media/${filenameWithoutExt}_exported.mp4`);
        const assPath = path.join(__dirname, `../public/uploads/social-media/${filenameWithoutExt}.ass`);

        // Generate ASS Subtitle File Content
        const primaryColor = hexToAssColor(styles.color || '#ffffff');
        const outlineColor = hexToAssColor(styles.strokeColor || '#000000');
        const shadowColor = hexToAssColor(styles.shadowColor || '#000000');
        const fontSize = styles.fontSize || 32;
        const fontName = styles.fontFamily === 'FM-Abhaya' ? 'FM-Abhaya' : 'Arial';
        const outline = styles.strokeWidth || 2;
        
        let assContent = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},${primaryColor},&H000000FF,${outlineColor},${shadowColor},1,0,0,0,100,100,0,0,1,${outline},2,2,10,10,50,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

        captions.forEach(cap => {
            const start = formatAssTime(cap.start);
            const end = formatAssTime(cap.end);
            // Replace newlines with ASS newline \N
            const text = cap.text.replace(/\n/g, '\\N');
            assContent += `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}\n`;
        });

        fs.writeFileSync(assPath, assContent);
        console.log('[Social Media] Generated ASS file for rendering.');

        // Render video with hardcoded subtitles using FFmpeg
        console.log('[Social Media] Starting FFmpeg export process...');
        
        // Return response immediately, let FFmpeg run in background
        res.status(200).json({ 
            message: "Export started", 
            // In a real app we'd use websockets or polling to notify when done.
            // For now we'll just mock the download URL so the UI can attempt to download it after a delay,
            // or just let them know it's being processed.
            downloadUrl: `/uploads/social-media/${filenameWithoutExt}_exported.mp4`
        });

        // Run FFmpeg
        ffmpeg(videoPath)
            .outputOptions([`-vf subtitles='${assPath}'`])
            .on('end', () => {
                console.log('[Social Media] Video exported successfully to', outputPath);
                // Clean up temp files if needed
            })
            .on('error', (err) => {
                console.error('[Social Media] Error during FFmpeg export:', err);
            })
            .save(outputPath);

    } catch (e) {
        console.error('[Social Media] Error in exportVideo:', e);
        if (!res.headersSent) {
            res.status(500).json({ error: "Failed to export video." });
        }
    }
};
