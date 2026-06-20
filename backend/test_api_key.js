const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI('AIzaSyDUfpDVy946hS3mxESKmgByMpS3UoZk6nw');
genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }).generateContent('hello').then(() => console.log('OK')).catch(e => console.error(e.message));
