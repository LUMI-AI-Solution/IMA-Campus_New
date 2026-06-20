const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI('AIzaSyAJ42sHmrnPnCri76KiyJSX0mglJnX_lmk');
genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }).generateContent('hello').then(() => console.log('OK')).catch(e => console.error(e.message));
