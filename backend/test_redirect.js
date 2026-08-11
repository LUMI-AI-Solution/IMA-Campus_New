const axios = require('axios');
async function test() {
    const url = "https://zoom.us/rec/download/-jcb6ooyAQ5fILrd7rkUolGo-peslt_fNKjuKd4mM_1Ve5UP2ZOwFDJBekNaDGeYHNJyxjxoBRnzhNY4.2025CUcYdglbc0bx?access_token=eyJzdiI6IjAwMDAwMiIsImFsZyI6IkhTNTEyIiwidiI6IjIuMCIsImtpZCI6IjM4NzhkODE2LWVhNmItNGE2OS1hOThlLWMxMzRiNGE5NDA4NyJ9.eyJhdWQiOiJodHRwczovL29hdXRoLnpvb20udXMiLCJ1aWQiOiJzY1FoU2hpY1Q2dV9kZW8zandYdUNRIiwidmVyIjoxMCwiYXVpZCI6ImE1NDQ5Njk1ZTJiMjNmMWE4YmZmNGYwZDIyM2FjYmFmMTVlYzAyNDNhNjIwYTYzYTFiYzgxZTg1MWMwZjE2ZTkiLCJuYmYiOjE3ODI0ODc5NjgsImNvZGUiOiJBU2tVRkRZQVRtYWNvV2dlWnczeUlBWDA4Z0xBRmsyZUgiLCJpc3MiOiJ6bTpjaWQ6aVUyYzdYWVVSU3lZX3lJeVNWRXVWZyIsImdubyI6MCwiZXhwIjoxNzgyNDkxNTY4LCJ0eXBlIjozLCJpYXQiOjE3ODI0ODc5NjgsImFpZCI6Im5zS3p1b1NiUUxxZUVLRk8yNVczUUEifQ.QoLt-gjUzubMDg3w_keA5fO8fKqv_49spBxcBjVISNAv-pOnAifUUNFOCS1ULpGcyPg2gPUug8o91PlvPDjrrA";
    try {
        const res = await axios.head(url, { maxRedirects: 0, validateStatus: s => s === 302 });
        console.log("Location:", res.headers.location);
    } catch (e) {
        console.log("Error:", e.message);
    }
}
test();
