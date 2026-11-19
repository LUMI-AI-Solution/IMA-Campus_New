// 🔥 Quick Reply attachments are kept as real files in storage/documents (not base64 in the DB),
// and the SERVER attaches them to the outgoing message. The browser only sends `quickReplyId`.
// This removes the old fragile path (browser rebuilding a file from base64), which made
// quick replies send only their text.
const fs = require('fs');
const path = require('path');
const prisma = require('../src/core/db');

const DOCS_DIR = path.join(process.cwd(), 'storage/documents');
const MIME_BY_EXT = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif',
    mp4: 'video/mp4', '3gp': 'video/3gpp', mov: 'video/quicktime',
    mp3: 'audio/mpeg', ogg: 'audio/ogg', m4a: 'audio/mp4', aac: 'audio/aac', wav: 'audio/wav', webm: 'audio/webm', opus: 'audio/ogg',
    pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', txt: 'text/plain'
};
const EXT_BY_MIME = Object.entries(MIME_BY_EXT).reduce((m, [e, t]) => { if (!m[t]) m[t] = e; return m; }, { 'audio/mpeg': 'mp3', 'image/jpeg': 'jpg' });

const mimeOfFile = (p) => MIME_BY_EXT[String(path.extname(p || '')).replace('.', '').toLowerCase()] || 'application/octet-stream';

// data:image/png;base64,....  ->  saved file. Returns "/storage/documents/QR_..." or null.
const saveDataUrl = (dataUrl, prefix) => {
    const m = /^data:([^;,]+)(;[^,]*)?,(.*)$/s.exec(String(dataUrl || ''));
    let mime = 'image/jpeg';
    let b64 = String(dataUrl || '');
    if (m) { mime = m[1].toLowerCase(); b64 = m[3]; }
    const buf = Buffer.from(b64, 'base64');
    if (!buf.length) return null;
    const ext = EXT_BY_MIME[mime.split(';')[0]] || (mime.split('/')[1] || 'bin').replace(/[^a-z0-9]/gi, '').slice(0, 5) || 'bin';
    if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });
    const filename = `${prefix}_${Date.now()}_${Math.round(Math.random() * 1e6)}.${ext}`;
    fs.writeFileSync(path.join(DOCS_DIR, filename), buf);
    return `/storage/documents/${filename}`;
};

// Makes sure a quick reply's attachment is a file on disk (converts old base64 ones once).
const ensureQuickReplyFile = async (qr) => {
    if (!qr || !qr.attachment) return null;
    let url = qr.attachment;
    if (!url.startsWith('/storage/documents/')) {
        url = saveDataUrl(url, `QR_${qr.id}`);
        if (!url) return null;
        await prisma.quickReply.update({ where: { id: qr.id }, data: { attachment: url } });
    }
    const abs = path.join(process.cwd(), url);
    if (!fs.existsSync(abs)) return null;
    return { url, abs, mime: mimeOfFile(abs) };
};

// Route middleware (after multer): if the browser sent quickReplyId and no file,
// attach the quick reply's file as req.file exactly like a normal upload.
const attachQuickReplyMedia = async (req, res, next) => {
    try {
        const qrId = parseInt(req.body?.quickReplyId);
        if (req.file || !qrId) return next();
        const qr = await prisma.quickReply.findUnique({ where: { id: qrId } });
        if (!qr) return res.status(404).json({ error: 'Quick reply not found' });
        const info = await ensureQuickReplyFile(qr);
        if (!info) return res.status(400).json({ error: 'This quick reply\'s attachment file is missing. Please re-upload it.' });
        const ext = path.extname(info.abs);
        const filename = `CHAT_QR_${Date.now()}${ext}`;
        const dest = path.join(DOCS_DIR, filename);
        fs.copyFileSync(info.abs, dest);
        req.file = {
            fieldname: 'media', originalname: `qr_attach${ext}`, encoding: '7bit', mimetype: info.mime,
            destination: 'storage/documents', filename, path: dest, size: fs.statSync(dest).size
        };
        return next();
    } catch (e) {
        console.error('attachQuickReplyMedia failed:', e);
        return res.status(500).json({ error: 'Failed to attach quick reply file' });
    }
};

module.exports = { saveDataUrl, ensureQuickReplyFile, attachQuickReplyMedia, mimeOfFile };
