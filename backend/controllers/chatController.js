const { Server } = require("socket.io");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

// AI Moderation imports
let genAI = null;
let model = null;
try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
} catch (e) {
    console.log("Failed to initialize Gemini AI for Chat Moderation", e);
}

// Global io instance
let io;

const fs = require('fs');
const path = require('path');

// Advanced String Checking Logic
const badWordsList = [
    "pka", "pko", "pky", "htt", "htto", "hkn", "hukhn", "cariy", "pnny", "wsy", "pyya",
    "paka", "pakan", "pkaya", "pyya", "payya", "ponnaya", "ponni", "pnni", "puka", "pk", "puke",
    "hutta", "huto", "huknn", "hknw", "hukapan", "hkp", "kimba", "kimb", "kmb", "kimbk",
    "kariya", "cry", "kari", "keri", "kery", "kate", "ktt",
    "wesa", "wesi", "wesy", "wsge", "wsh",
    "gona", "balla", "blli", "goth", "gotha", "thohke"
];

const badPhrasesList = [
    "goth pk", "muhudu huk", "kari pk", "wesa ball", "wesa gani", "wsige pt", "wesige put",
    "ktt den", "kate di", "kta dnn", "kate dn", "puk ghn", "puke ar", "pk ar", "puka dpn",
    "kari pnn", "cry pnn", "adu kule", "huthige", "hthg", "httg", "cariy bll"
];

const blockedLinksList = ["http", "www", "zoom", "meet", "youtube", "bit.ly", ".com", ".lk"];

function checkProfanityLocal(message) {
    if (!message) return false;
    
    // Normalize text: handle common substitutions and spaces
    let normalizedText = message.toLowerCase()
                                .replace(/[@4^]/g, 'a')
                                .replace(/[3]/g, 'e')
                                .replace(/[1!|]/g, 'i')
                                .replace(/[0]/g, 'o')
                                .replace(/[^a-z0-9 ]/g, '') // Keep letters/numbers/spaces
                                .replace(/\s+/g, ' ')
                                .trim();

    // 1. Link Check
    const hasLink = blockedLinksList.some(link => message.toLowerCase().includes(link));
    if (hasLink) return true;

    // 2. Single Words Check
    const wordsInMessage = normalizedText.split(' ');
    const hasBadWord = wordsInMessage.some(word => 
        badWordsList.some(badWord => word.includes(badWord))
    );
    if (hasBadWord) return true;

    // 3. Phrases Check
    const textWithoutSpaces = normalizedText.replace(/\s+/g, '');
    const hasBadPhrase = badPhrasesList.some(phrase => {
        const phraseWithoutSpaces = phrase.replace(/\s+/g, '');
        return textWithoutSpaces.includes(phraseWithoutSpaces);
    });
    if (hasBadPhrase) return true;

    return false;
}

const moderateMessage = async (messageText, attachmentUrl = null) => {
    // We will do string matching as a fallback or pre-check
    try {
        // Run local advanced check first. If it flags it, we don't even need to hit the AI.
        const isLocallyBlocked = checkProfanityLocal(messageText);
        if (isLocallyBlocked) {
            return true;
        }

        let parsed = { isViolation: false };

        if (!model || !process.env.GEMINI_API_KEY) {
            // If AI is not configured, we rely solely on the local check (which we already did)
            return false;
        }

        const genAI = new (require('@google/generative-ai').GoogleGenerativeAI)(process.env.GEMINI_API_KEY);
        // Using gemini-2.5-flash with structured JSON output for accuracy
        const strictModel = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
            }
        });

        const prompt = `Analyze the following message and any attached image in Singlish/Sinhala or English. 
Flag it as 'PROFANITY' (isViolation: true) if it contains:
1. Direct vulgar words (e.g., derivations of paka, hutta, kari, ponnaya, wesi).
2. Derogatory compound phrases/sexual innuendos (e.g., 'ktt denwd' [oral sex reference], 'muhudu huknn', 'goth pka').
3. Pornographic, nude, sexual, or highly explicit content in the text or attached image.
4. ANY link/URL (e.g., zoom.us, meet.google, youtube, http, www).

Ignore spaces, numbers, and special characters used to obfuscate these terms.

Return a valid JSON object EXACTLY like this:
{
  "isViolation": true or false
}

Message to evaluate: "${messageText || ""}"`;

        const parts = [prompt];

        if (attachmentUrl) {
            const filePath = path.join(__dirname, '../../storage/images/chat_uploads', attachmentUrl);
            if (fs.existsSync(filePath)) {
                const mimeType = filePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
                parts.push({
                    inlineData: {
                        data: fs.readFileSync(filePath).toString("base64"),
                        mimeType: mimeType
                    }
                });
            }
        }
        
        const result = await strictModel.generateContent(parts);
        const responseText = result.response.text();
        parsed = JSON.parse(responseText);
        return parsed.isViolation === true;
    } catch (e) {
        console.error("AI Moderation Error:", e);
        return false;
    }
};

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*", // allow all origins since mobile connects here
            methods: ["GET", "POST"]
        }
    });

    // Socket auth middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) return next(new Error("Authentication error"));
        
        try {
            const verified = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = verified; // { userId/id, role, ... }
            next();
        } catch (err) {
            return next(new Error("Authentication error"));
        }
    });

    io.on("connection", async (socket) => {
        const userId = socket.user.id || socket.user.userId;
        console.log(`Socket connected: ${socket.id} (User: ${userId})`);
        
        // Always join personal room for global notifications
        socket.join(`user_${userId}`);
        
        // Auto-join WA idle pool if agent is already marked ACTIVE in DB
        try {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (user && user.agentStatus === 'ACTIVE') {
                const roleUpper = user.role ? String(user.role).toUpperCase().replace(/ /g, '_') : "";
                const isRestrictedRole = ['SYSTEM_ADMIN'].some(r => roleUpper.includes(r));
                if (!isRestrictedRole) {
                    const businessType = user.businessType ? String(user.businessType).trim() : "ALL";
                    socket.join(`wa_call_agent_idle_${businessType}`);
                    console.log(`[WA Pool] Agent ${userId} automatically rejoined idle pool ${businessType} on connect`);
                }
            }
        } catch (err) {
            console.error("Error auto-joining agent to WA pool:", err);
        }

        socket.on("join_business_chat", async (data) => {
            const businessId = data.businessId;
            if (!businessId) return;
            
            const roomName = `business_chat_${businessId}`;
            socket.join(roomName);
            console.log(`User ${socket.user.id || socket.user.userId} joined ${roomName}`);
            
            const room = io.sockets.adapter.rooms.get(roomName);
            io.to(roomName).emit("online_count", { count: room ? room.size : 0 });
        });

        socket.on("send_message", async (data) => {
            console.log("🔥 [Socket Debug] Received send_message event:", data);
            const { businessId, message, metadata } = data; // Accept metadata
            if (!businessId || (!message && !metadata)) {
                console.log("🔥 [Socket Debug] Aborting: Missing businessId or empty message/metadata");
                return;
            }

            const userId = parseInt(socket.user.id || socket.user.userId, 10);
            console.log("🔥 [Socket Debug] Extracted userId:", userId, "from socket.user:", socket.user);

            try {
                // Check if chat is locked
                const lockStatus = await prisma.businessChatSetting.findUnique({
                    where: { businessId: parseInt(businessId) }
                });
                
                const userRole = String(socket.user.role || 'Student').toUpperCase();
                const isStaff = userRole !== 'STUDENT' && userRole !== 'USER';

                if (lockStatus?.isLocked && !isStaff) {
                    socket.emit("error", { message: "Chat is currently locked by administrators." });
                    return;
                }

                // Verify User
                const user = await prisma.user.findUnique({
                    where: { id: userId },
                    select: { appChatUsername: true, appChatDp: true, role: true, firstName: true }
                });

                if (!user) return;
                
                // For students, username is required
                if (!isStaff && !user.appChatUsername) {
                    socket.emit("error", { message: "Please set your chat profile first." });
                    return;
                }

                // AI Moderation check asynchronously (only if text or image exists)
                let isViolation = false;
                if (message || metadata?.attachmentUrl) {
                    isViolation = await moderateMessage(message, metadata?.attachmentUrl);
                }

                const savedMsg = await prisma.appChatMessage.create({
                    data: {
                        businessId: parseInt(businessId),
                        senderId: userId,
                        message: message ? message.trim() : "",
                        metadata: metadata || null, // Store attachments/polls
                        isDeleted: isViolation,
                        deletedByAI: isViolation
                    },
                    include: {
                        sender: {
                            select: { appChatUsername: true, appChatDp: true, role: true, firstName: true }
                        }
                    }
                });

                console.log("🔥 [Socket Debug] Message saved to DB successfully! ID:", savedMsg.id);
                io.to(`business_chat_${businessId}`).emit("new_message", savedMsg);
                console.log("🔥 [Socket Debug] Emitted new_message to room");

            } catch (err) {
                console.error("🔥 [Socket Debug] Error sending message:", err);
            }
        });
        
        socket.on("delete_message", async (data) => {
            const { messageId, businessId } = data;
            const userRole = String(socket.user.role || 'Student').toUpperCase();
            if (userRole === 'STUDENT' || userRole === 'USER') return; // Only staff

            try {
                const msg = await prisma.appChatMessage.update({
                    where: { id: parseInt(messageId) },
                    data: { isDeleted: true }
                });
                io.to(`business_chat_${businessId}`).emit("message_deleted", { messageId: msg.id, deletedByAdmin: true });
            } catch (err) {
                console.error(err);
            }
        });

        socket.on("pin_message", async (data) => {
            const { messageId, businessId, isPinned } = data;
            const userRole = String(socket.user.role || 'Student').toUpperCase();
            if (userRole === 'STUDENT' || userRole === 'USER') return;

            try {
                const msg = await prisma.appChatMessage.update({
                    where: { id: parseInt(messageId) },
                    data: { isPinned: isPinned }
                });
                io.to(`business_chat_${businessId}`).emit("message_pinned", { messageId: msg.id, isPinned: msg.isPinned });
            } catch (err) {
                console.error(err);
            }
        });

        socket.on("toggle_lock", async (data) => {
            const { businessId, isLocked } = data;
            const userRole = String(socket.user.role || 'Student').toUpperCase();
            if (userRole === 'STUDENT' || userRole === 'USER') return;

            try {
                const setting = await prisma.businessChatSetting.upsert({
                    where: { businessId: parseInt(businessId) },
                    update: { isLocked },
                    create: { businessId: parseInt(businessId), isLocked }
                });
                io.to(`business_chat_${businessId}`).emit("chat_locked_toggled", { isLocked: setting.isLocked });
            } catch (err) {
                console.error(err);
            }
        });

        socket.on("react_message", async (data) => {
            const { messageId, businessId, emoji } = data;
            const userId = socket.user.id || socket.user.userId;
            
            try {
                const msg = await prisma.appChatMessage.findUnique({ where: { id: parseInt(messageId) } });
                if (!msg) return;

                const meta = msg.metadata || {};
                if (!meta.reactions) meta.reactions = {};
                meta.reactions[userId] = emoji;

                const updated = await prisma.appChatMessage.update({
                    where: { id: parseInt(messageId) },
                    data: { metadata: meta }
                });
                io.to(`business_chat_${businessId}`).emit("message_updated", { messageId: updated.id, metadata: updated.metadata });
            } catch (err) {
                console.error(err);
            }
        });

        socket.on("vote_poll", async (data) => {
            const { messageId, businessId, optionIndex } = data;
            const userId = socket.user.id || socket.user.userId;
            
            try {
                const msg = await prisma.appChatMessage.findUnique({ where: { id: parseInt(messageId) } });
                if (!msg || !msg.metadata?.poll) return;

                const meta = msg.metadata;
                if (!meta.poll.votes) meta.poll.votes = {};
                meta.poll.votes[userId] = optionIndex;

                const updated = await prisma.appChatMessage.update({
                    where: { id: parseInt(messageId) },
                    data: { metadata: meta }
                });
                io.to(`business_chat_${businessId}`).emit("message_updated", { messageId: updated.id, metadata: updated.metadata });
            } catch (err) {
                console.error(err);
            }
        });

        // ==========================================
        // WEB INQUIRY (1-on-1 Support Chat) EVENTS
        // ==========================================

        socket.on("join_web_inquiry_room", (data) => {
            const { inquiryId } = data;
            if (!inquiryId) return;
            const roomName = `web_inquiry_${inquiryId}`;
            socket.join(roomName);
            console.log(`User ${socket.user.id || socket.user.userId} joined ${roomName}`);
        });

        // Staff can join a general room for a business to get notifications for ALL inquiries in that business
        socket.on("join_web_inquiry_staff", (data) => {
            const { businessId } = data;
            const userRole = String(socket.user.role || 'Student').toUpperCase();
            if (userRole === 'STUDENT' || userRole === 'USER') return; // Only staff

            if (!businessId) return;
            const roomName = `web_inquiry_staff_${businessId}`;
            socket.join(roomName);
            console.log(`Staff ${socket.user.id || socket.user.userId} joined ${roomName}`);
        });

        socket.on("claim_web_inquiry_toast", (data) => {
            const { messageId, businessId } = data;
            if (!messageId || !businessId) return;
            
            // Broadcast to all staff in this business to dismiss the toast locally
            io.to(`web_inquiry_staff_${businessId}`).emit("dismiss_web_inquiry_toast", { messageId });
        });


        socket.on("send_web_inquiry_message", async (data) => {
            const { inquiryId, businessId, message, mediaUrl, mediaType, replyToId } = data;
            if (!inquiryId || (!message && !mediaUrl)) return;

            const userId = parseInt(socket.user.id || socket.user.userId, 10);
            const userRole = String(socket.user.role || 'Student').toUpperCase();
            const isStaff = userRole !== 'STUDENT' && userRole !== 'USER';

            try {
                // Get sender info
                const sender = await prisma.user.findUnique({
                    where: { id: userId },
                    select: { firstName: true, lastName: true, role: true }
                });
                
                if (!sender) return;
                
                const senderName = isStaff ? `${sender.firstName} ${sender.lastName}` : null;
                const direction = isStaff ? 'outbound' : 'inbound';
                const senderType = isStaff ? 'SYSTEM' : 'USER'; // SYSTEM means staff (from CRM)

                const savedMsg = await prisma.webInquiryMessage.create({
                    data: {
                        inquiryId: parseInt(inquiryId),
                        message: message ? message.trim() : "",
                        mediaUrl: mediaUrl || null,
                        mediaType: mediaType || null,
                        direction,
                        senderType,
                        senderId: userId,
                        senderName,
                        replyToId: replyToId ? parseInt(replyToId) : null,
                    },
                    include: {
                        senderUser: { select: { firstName: true, lastName: true, role: true } },
                        replyTo: { select: { message: true, mediaUrl: true, senderName: true } }
                    }
                });

                // Update the Inquiry's last message and unread count
                const updatedInq = await prisma.webInquiry.update({
                    where: { id: parseInt(inquiryId) },
                    data: {
                        lastMessage: message ? message.substring(0, 50) : (mediaUrl ? '[Attachment]' : ''),
                        lastMessageAt: new Date(),
                        unreadCount: { increment: direction === 'inbound' ? 1 : 0 },
                        studentUnreadCount: { increment: direction === 'outbound' ? 1 : 0 }
                    }
                });

                // Emit to the specific chat room (Both student and staff looking at this chat)
                io.to(`web_inquiry_${inquiryId}`).emit("new_web_inquiry_message", savedMsg);

                // If student sent it, notify all staff members in that business's staff room
                if (!isStaff && businessId) {
                    io.to(`web_inquiry_staff_${businessId}`).emit("web_inquiry_notification", {
                        inquiryId,
                        businessId,
                        message: savedMsg
                    });
                    
                    // AI AGENT TRIGGER
                    if (message && message.toLowerCase().trim().startsWith('hey ima bot')) {
                        const aiAgentController = require('./aiAgentController');
                        aiAgentController.handleStudentBotMessage(inquiryId, businessId, message, userId, replyToId).catch(err => {
                            console.error("Failed to trigger AI bot:", err);
                        });
                    }
                } else if (isStaff) {
                    // Notify student anywhere they are
                    if (updatedInq.studentId) {
                        io.to(`user_${updatedInq.studentId}`).emit("web_inquiry_student_notification", {
                            inquiryId: updatedInq.id,
                            businessId: updatedInq.businessId,
                            message: savedMsg
                        });
                    }
                }

            } catch (err) {
                console.error("Error sending web inquiry message:", err);
            }
        });

        socket.on("react_web_inquiry_message", async (data) => {
            const { messageId, inquiryId, emoji } = data;
            const userId = socket.user.id || socket.user.userId;
            
            try {
                const msg = await prisma.webInquiryMessage.findUnique({ where: { id: parseInt(messageId) } });
                if (!msg) return;

                let meta = msg.reactions || {};
                // if reactions is string, parse it
                if (typeof meta === 'string') meta = JSON.parse(meta);
                
                meta[userId] = emoji;

                const updated = await prisma.webInquiryMessage.update({
                    where: { id: parseInt(messageId) },
                    data: { reactions: meta }
                });
                
                io.to(`web_inquiry_${inquiryId}`).emit("web_inquiry_message_updated", { 
                    messageId: updated.id, 
                    reactions: updated.reactions 
                });
            } catch (err) {
                console.error(err);
            }
        });
        socket.on("join_wa_agent_pool", async (data) => {
            const status = data?.status || "ACTIVE"; // ACTIVE, LUNCH, AWAY
            const userId = socket.user.id || socket.user.userId;
            
            // Fetch user's businessType to join correct pool
            try {
                const user = await prisma.user.findUnique({ where: { id: userId }, select: { businessType: true, agentStatus: true, role: true } });
                const businessType = user?.businessType ? String(user.businessType).trim() : "ALL";
                const roleUpper = user?.role ? String(user.role).toUpperCase().replace(/ /g, '_') : "";
                
                const isRestrictedRole = ['SYSTEM_ADMIN'].some(r => roleUpper.includes(r));
                
                // Save status in DB
                await prisma.user.update({
                    where: { id: userId },
                    data: { agentStatus: status }
                });

                if (status === "ACTIVE" && !isRestrictedRole) {
                    console.log(`[WA Pool] Agent ${userId} marked as IDLE/ACTIVE in ${businessType}`);
                } else {
                    if (isRestrictedRole && status === "ACTIVE") {
                        console.log(`[WA Pool] Agent ${userId} is ACTIVE but restricted from WA calls (Role: ${user?.role})`);
                    } else {
                        console.log(`[WA Pool] Agent ${userId} marked as ${status}, leaving pools`);
                    }
                }

                // Force ALL sockets for this user to join/leave the pool (handles multiple tabs)
                const userSocketsRoom = io.sockets.adapter.rooms.get(`user_${userId}`);
                if (userSocketsRoom) {
                    for (const socketId of userSocketsRoom) {
                        const s = io.sockets.sockets.get(socketId);
                        if (s) {
                            if (status === "ACTIVE" && !isRestrictedRole) {
                                s.join(`wa_call_agent_idle_${businessType}`);
                            } else {
                                s.leave(`wa_call_agent_idle_${businessType}`);
                            }
                        }
                    }
                }

                // Notify admin/manager dashboards
                io.emit("agent_status_changed", { userId, status, businessType });

            } catch (err) {
                console.error("[WA Pool] Error updating agent pool/status", err);
            }
        });

        socket.on("leave_wa_agent_pool", async () => {
            const userId = socket.user.id || socket.user.userId;
            try {
                const user = await prisma.user.findUnique({ where: { id: userId }, select: { businessType: true } });
                const businessType = user?.businessType ? String(user.businessType).trim() : "ALL";
                
                await prisma.user.update({
                    where: { id: userId },
                    data: { agentStatus: "OFFLINE" }
                });

                console.log(`[WA Pool] Agent ${userId} marked as OFFLINE`);
                
                const userSocketsRoom = io.sockets.adapter.rooms.get(`user_${userId}`);
                if (userSocketsRoom) {
                    for (const socketId of userSocketsRoom) {
                        const s = io.sockets.sockets.get(socketId);
                        if (s) {
                            s.leave(`wa_call_agent_idle_${businessType}`);
                        }
                    }
                }
                
                // Notify admin/manager dashboards
                io.emit("agent_status_changed", { userId, status: "OFFLINE", businessType });

            } catch (err) {
                console.error("[WA Pool] Error leaving pool", err);
            }
        });

        socket.on("disconnecting", () => {
            for (const roomName of socket.rooms) {
                if (roomName.startsWith("business_chat_")) {
                    const room = io.sockets.adapter.rooms.get(roomName);
                    io.to(roomName).emit("online_count", { count: room ? Math.max(0, room.size - 1) : 0 });
                }
            }
        });

        socket.on("disconnect", () => {
            console.log(`Socket disconnected: ${socket.id}`);
        });
    });
};

// HTTP API Controllers

exports.getProfile = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { appChatUsername: true, appChatDp: true, role: true }
        });
        res.json({ success: true, profile: user });
    } catch (e) {
        res.status(500).json({ success: false, error: "Server error" });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const { username, dp } = req.body;
        
        if (!username) return res.status(400).json({ success: false, error: "Username is required" });

        // Check if username is taken
        const existing = await prisma.user.findFirst({
            where: { appChatUsername: username, id: { not: userId } }
        });
        if (existing) {
            return res.status(400).json({ success: false, error: "Username is already taken" });
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: { appChatUsername: username, appChatDp: dp }
        });
        
        res.json({ success: true, profile: { appChatUsername: user.appChatUsername, appChatDp: user.appChatDp } });
    } catch (e) {
        res.status(500).json({ success: false, error: "Server error" });
    }
};

exports.getHistory = async (req, res) => {
    try {
        const { businessId } = req.params;
        const messages = await prisma.appChatMessage.findMany({
            where: { businessId: parseInt(businessId) },
            orderBy: { createdAt: 'desc' },
            take: 100,
            include: {
                sender: {
                    select: { appChatUsername: true, appChatDp: true, role: true, firstName: true }
                }
            }
        });

        const lockSetting = await prisma.businessChatSetting.findUnique({
            where: { businessId: parseInt(businessId) }
        });

        res.json({ 
            success: true, 
            messages: messages.reverse(), 
            isLocked: lockSetting?.isLocked || false 
        });
    } catch (e) {
        res.status(500).json({ success: false, error: "Server error" });
    }
};

exports.getMyBusinesses = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const userRole = String(req.user.role || 'Student').toUpperCase();
        
        if (userRole === 'STUDENT' || userRole === 'USER') {
            // Find businesses the student is enrolled in (has payments/leads)
            const payments = await prisma.payment.findMany({
                where: { studentId: userId, status: 5 },
                select: { businessId: true },
                distinct: ['businessId']
            });
            const bIds = payments.map(p => p.businessId).filter(Boolean);
            
            const businesses = await prisma.business.findMany({
                where: { id: { in: bIds }, status: 1 },
                select: { id: true, name: true, logo: true }
            });
            return res.json({ success: true, businesses });
        } else {
            // For staff, return all active businesses (or you could filter by their assignment)
            const businesses = await prisma.business.findMany({
                where: { status: 1 },
                select: { id: true, name: true, logo: true }
            });
            return res.json({ success: true, businesses });
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, error: "Server error" });
    }
};

exports.uploadAttachment = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, error: "No image provided" });
        return res.json({ success: true, imageUrl: req.file.filename });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, error: "Server error" });
    }
};

exports.initSocket = initSocket;
exports.getIo = () => io;
