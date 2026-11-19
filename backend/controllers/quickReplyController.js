const { PrismaClient } = require('@prisma/client');
const prisma = require('../src/core/db');
const { saveDataUrl, ensureQuickReplyFile, mimeOfFile } = require('../utils/quickReplyMedia');

// Get Quick Replies for the logged-in user (including shared system templates)
exports.getQuickReplies = async (req, res) => {
    try {
        const userId = parseInt(req.user?.userId || req.user?.id);
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        // Find system admin IDs (e.g. 308 or roles SYSTEM_ADMIN / ADMIN)
        const systemAdminUsers = await prisma.user.findMany({
            where: { role: { in: ['SYSTEM_ADMIN', 'ADMIN', 'Super Admin'] } },
            select: { id: true }
        });
        const systemUserIds = new Set([308, ...systemAdminUsers.map(u => u.id)]);

        // 1. Fetch user's own quick replies
        const userReplies = await prisma.quickReply.findMany({
            where: { userId: userId },
            orderBy: { createdAt: 'desc' }
        });

        // 2. Fetch shared system quick replies
        const systemReplies = await prisma.quickReply.findMany({
            where: { userId: { in: Array.from(systemUserIds) } },
            orderBy: { createdAt: 'desc' }
        });

        // 3. Merge: user's personal replies override system templates if shortcut matches
        const map = new Map();
        userReplies.forEach(r => {
            const key = (r.name || '').toLowerCase().trim();
            if (key) {
                map.set(key, {
                    ...r,
                    isOwn: true,
                    isSystem: false
                });
            }
        });

        systemReplies.forEach(r => {
            const key = (r.name || '').toLowerCase().trim();
            if (key && !map.has(key)) {
                map.set(key, {
                    ...r,
                    isOwn: r.userId === userId,
                    isSystem: r.userId !== userId
                });
            }
        });

        const merged = Array.from(map.values());

        // Old quick replies kept the attachment as base64 -> convert them to files once.
        // The list returns a small URL + type instead of megabytes of base64.
        const out = [];
        for (const r of merged) {
            let attachment = r.attachment || null;
            let attachmentType = null;
            if (attachment) {
                try {
                    const info = await ensureQuickReplyFile(r);
                    if (info) { attachment = info.url; attachmentType = info.mime; }
                    else { attachment = null; }
                } catch (e) { console.error('QR attachment convert failed', r.id, e.message); attachment = null; }
            }
            out.push({ ...r, attachment, attachmentType, hasAttachment: Boolean(attachment) });
        }

        res.status(200).json(out);
    } catch (error) {
        console.error("Error fetching quick replies:", error);
        res.status(500).json({ error: "Failed to fetch quick replies" });
    }
};

// Create a new Quick Reply
exports.createQuickReply = async (req, res) => {
    try {
        const userId = parseInt(req.user?.userId || req.user?.id);
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const { name, message, attachment } = req.body;

        if (!name || (!message && !attachment)) {
            return res.status(400).json({ error: "Name and either message or attachment are required" });
        }

        const cleanName = name.replace(/^\/+/, '').trim();
        if (!cleanName) {
            return res.status(400).json({ error: "Shortcut name cannot be empty" });
        }

        // Save the attachment as a real file (not base64 in the DB)
        let attachmentUrl = null;
        if (attachment) {
            attachmentUrl = String(attachment).startsWith('/storage/documents/') ? attachment : saveDataUrl(attachment, `QR_U${userId}`);
            if (!attachmentUrl) return res.status(400).json({ error: "Attachment could not be read. Please choose the file again." });
        }

        const reply = await prisma.quickReply.create({
            data: {
                userId,
                name: cleanName,
                message: message ? message.trim() : null,
                attachment: attachmentUrl
            }
        });

        res.status(201).json({
            ...reply,
            attachmentType: attachmentUrl ? mimeOfFile(attachmentUrl) : null,
            hasAttachment: Boolean(attachmentUrl),
            isOwn: true,
            isSystem: false
        });
    } catch (error) {
        console.error("Error creating quick reply:", error);
        res.status(500).json({ error: "Failed to create quick reply. File might be too large." });
    }
};

// Delete a Quick Reply
exports.deleteQuickReply = async (req, res) => {
    try {
        const userId = parseInt(req.user?.userId || req.user?.id);
        const replyId = parseInt(req.params.id);

        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        // Ensure the reply exists
        const reply = await prisma.quickReply.findUnique({ where: { id: replyId } });
        if (!reply) {
            return res.status(404).json({ error: "Quick reply not found" });
        }

        // Allow owner to delete, OR system admins to delete any
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
        const isSysAdmin = user && ['SYSTEM_ADMIN', 'ADMIN', 'Super Admin'].includes(user.role);

        if (reply.userId !== userId && !isSysAdmin) {
            return res.status(403).json({ error: "You cannot delete shared system templates" });
        }

        await prisma.quickReply.delete({ where: { id: replyId } });

        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Error deleting quick reply:", error);
        res.status(500).json({ error: "Failed to delete quick reply" });
    }
};
