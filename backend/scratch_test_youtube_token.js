require('dotenv').config({ path: '/root/IMA-Campus/backend/.env' });
const { OAuth2Client } = require('google-auth-library');

async function testYouTubeToken() {
    try {
        console.log("Testing YouTube OAuth Credentials...");
        console.log("Client ID:", process.env.GOOGLE_YOUTUBE_CLIENT_ID ? "Loaded" : "Missing");
        console.log("Client Secret:", process.env.GOOGLE_YOUTUBE_CLIENT_SECRET ? "Loaded" : "Missing");
        console.log("Refresh Token:", process.env.GOOGLE_YOUTUBE_REFRESH_TOKEN ? "Loaded" : "Missing");

        const oauth2Client = new OAuth2Client(
            process.env.GOOGLE_YOUTUBE_CLIENT_ID,
            process.env.GOOGLE_YOUTUBE_CLIENT_SECRET
        );

        oauth2Client.setCredentials({
            refresh_token: process.env.GOOGLE_YOUTUBE_REFRESH_TOKEN
        });

        console.log("\nAttempting to get a new access token...");
        const { credentials } = await oauth2Client.refreshAccessToken();
        
        console.log("✅ Success! Got new access token.");
        console.log("Access Token starts with:", credentials.access_token.substring(0, 15) + "...");
        console.log("Token Expiry:", new Date(credentials.expiry_date).toLocaleString());
        
    } catch (error) {
        console.error("❌ Failed to get access token.");
        console.error("Error details:", error.message);
    }
}

testYouTubeToken();
