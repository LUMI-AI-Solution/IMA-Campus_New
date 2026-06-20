const { VertexAI } = require('@google-cloud/vertexai');

async function test() {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/root/IMA-Campus/backend/serviceAccountKey.json';
    try {
        const vertex_ai = new VertexAI({project: 'ima-campus', location: 'us-central1'});
        const model = vertex_ai.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("hello");
        const response = await result.response;
        console.log("Success:", response.candidates[0].content.parts[0].text);
    } catch(err) {
        console.error("Vertex Error:", err);
    }
}
test();
