const { spawn } = require('child_process');
const express = require('express');
const app = express();

app.get('/zoom', (req, res) => {
    const url = req.query.url;
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', 'attachment; filename="zoom_video.mp4"');
    
    const yt = spawn('yt-dlp', ['-o', '-', url]);
    yt.stdout.pipe(res);
    yt.stderr.on('data', data => console.log(data.toString()));
});

app.listen(9876, () => console.log('Proxy on 9876'));
