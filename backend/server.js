const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const admin = require("firebase-admin"); // 🔥 Firebase Admin Import

dotenv.config();
const app = express();

app.use('/api/courier-proxy', createProxyMiddleware({
    target: 'https://www.fdedomestic.com',
    changeOrigin: true,
    pathRewrite: {
        '^/api/courier-proxy': '', // URL එකෙන් මේ කෑල්ල කපලා යවනවා
    },
    onProxyRes: function (proxyRes, req, res) {
        // මේ Headers මකන නිසා දැන් Browser එකට Iframe එක ඇතුලේ මේක ලෝඩ් කරන්න පුළුවන්!
        delete proxyRes.headers['x-frame-options'];
        delete proxyRes.headers['content-security-policy'];

        // Cookie අවුල් යන්නැති වෙන්න SameSite එක හදනවා
        if (proxyRes.headers['set-cookie']) {
            proxyRes.headers['set-cookie'] = proxyRes.headers['set-cookie'].map(c =>
                c.replace(/SameSite=Lax/g, 'SameSite=None; Secure')
            );
        }
    }
}));

// ================= FIREBASE INITIALIZATION =================
// Firebase Console eken gaththa Service Account JSON file eka
// backend folder eke 'serviceAccountKey.json' kiyala save karala thiyenna ona.
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// ================= MIDDLEWARES =================

const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            'http://72.62.249.211:5175',
            'http://localhost:5175',
            'http://localhost:5173',
            'http://localhost:5174',
            'http://localhost:3000',
            'https://imacampus.online',
            'https://www.imacampus.online'
        ];

        // Dynamically allow local LAN IPs (10.x.x.x, 192.168.x.x, 172.16-31.x.x) and localhost variants
        const isLocalIp = origin && (
            origin.startsWith('http://10.') ||
            origin.startsWith('http://192.168.') ||
            origin.startsWith('http://172.') ||
            origin.startsWith('http://localhost') ||
            origin.startsWith('http://127.0.0.1')
        );

        // Dynamically allow all subdomains and domain variations of imacampus.online
        const isImaCampus = origin && origin.includes('imacampus.online');

        if (!origin || allowedOrigins.includes(origin) || isLocalIp || isImaCampus) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
    credentials: true
};

app.use(cors(corsOptions));

// 🔥 EXPRESS ALUTH UPDATE EKA NISA CRASH WENNE NATHI WENNA, 
// MANUAL WIDIYATA PREFLIGHT (OPTIONS) HANDLE KARANA KALLA 🔥
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        const origin = req.headers.origin;
        const allowedOrigins = [
            'http://72.62.249.211:5175',
            'http://localhost:5175',
            'http://localhost:5173',
            'http://localhost:5174',
            'http://localhost:3000',
            'https://imacampus.online',
            'https://www.imacampus.online'
        ];

        if (allowedOrigins.includes(origin) || !origin) {
            res.header('Access-Control-Allow-Origin', origin || '*');
        }
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        res.header('Access-Control-Allow-Credentials', 'true');

        // Options request ekata 200 OK kiyala yawanawa route walata yanna kalin
        return res.status(200).end();
    }
    next();
});

app.use(express.json());

const coordinatorCrmRoutes = require('./routes/coordinatorCrmRoutes');
const afterSeminarCrmRoutes = require('./routes/afterSeminarCrmRoutes');
const teamRoutes = require('./routes/teamRoutes');

// ================= STATIC FOLDERS =================
// Kalin thibuna routes (meka mehema thiyenna arinna wena ewata one wenna puluwan)
app.use('/documents', express.static(path.join(__dirname, 'documents')));
app.use('/api/documents', express.static(path.join(__dirname, 'documents')));
app.use('/storage/icons', express.static(path.join(__dirname, 'storage/icons')));
app.use('/storage/posts', express.static(path.join(__dirname, 'storage/posts')));
app.use('/storage/images', express.static(path.join(__dirname, 'storage/images')));
app.use('/images', express.static(path.join(__dirname, 'storage/images')));
app.use('/storage/documents', express.static(path.join(__dirname, 'storage/documents')));

// 🔥 FIX: Mobile app & Web preview ekata /api/ url eken document ganna me routes tika add kala 🔥
app.use('/api/storage/documents', express.static(path.join(__dirname, 'storage/documents')));
app.use('/api/storage/icons', express.static(path.join(__dirname, 'storage/icons')));
app.use('/api/storage/posts', express.static(path.join(__dirname, 'storage/posts')));
app.use('/api/storage/images', express.static(path.join(__dirname, 'storage/images')));


// ================= MODULAR ROUTES =================
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/student', require('./routes/studentRoutes'));
app.use('/api', require('./routes/contentRoutes'));
app.use('/api/admin', require('./routes/timetableRoutes'));
app.use('/api/admin', require('./routes/taskRoutes'));
app.use('/api/admin/staff', require('./routes/staffRoutes'));
app.use('/api', require('./routes/businessRoutes'));
app.use('/api/public', require('./routes/publicRoutes'));
app.use('/api/admin/delivery', require('./routes/deliveryRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/admin/payments', require('./routes/paymentRoutes'));
app.use('/api/admin/crm', require('./routes/crmRoutes'));
app.use('/api/reminders', require('./routes/reminderRoutes'));
app.use('/api/system-tasks', require('./routes/systemTaskRoutes'));
app.use('/api/upgrade-pricing', require('./routes/upgradePricingRoutes'));
app.use('/api/zoom-accounts', require('./routes/zoomAccountRoutes'));
app.use('/api/technical', require('./routes/technicalRoutes'));



// 🔥 NEW: Add Data Export Route here 🔥
app.use('/api/admin/data-export', require('./routes/dataExportRoutes')); // Mekath hadanna ona

app.use('/api/coordinator-crm', coordinatorCrmRoutes);
app.use('/api/after-seminar-crm', afterSeminarCrmRoutes);
app.use('/api/team', teamRoutes);

// 🔥🔥🔥 MOBILE APP ROUTES 🔥🔥🔥
app.use('/api/mobile', require('./routes/mobile/mobileRoutes'));

// AI Verification Routes
app.use('/api/ai-verification', require('./routes/aiVerificationRoutes'));

const rosterRoutes = require('./routes/rosterRoutes');
app.use('/api/roster', rosterRoutes);

const callCenterRoutes = require('./routes/callCenterRoutes');
app.use('/api/call-center', callCenterRoutes);
const callCenterAgentRoutes = require('./routes/callCenterAgentRoutes');
app.use('/api/call-center/agent-v2', callCenterAgentRoutes);

// ================= DELIVERY MODULE ROUTES (NEW) =================


// 🔥 පැය 10න් Auto Update වෙන Cron Job එක Run වෙන්න Controller එක Load කරනවා 🔥
require('./controllers/deliveryController');
// 🔥 AUTO BACKUP SERVICE (CRON JOB) 🔥
require('./services/backupService');

// ================= SERVER START =================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Backend Server is running cleanly on port ${PORT}`);
});


// ==========================================================
// 🔥 DAILY CUSTOM TASK GENERATOR (CRON JOB) 🔥
// ==========================================================
const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prismaTaskGen = new PrismaClient();

// හැමදාම පාන්දර 12:05 ට මේක Auto Run වෙනවා ('5 0 * * *')
cron.schedule('5 0 * * *', async () => {
    console.log("⏰ Running Daily Custom Task Generator...");
    try {
        // SLT වෙලාව හදාගන්නවා
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Colombo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });

        const datePrefix = formatter.format(now); // Auto enawa "2026-05-15" wage
        const todayDay = parseInt(datePrefix.split('-')[2], 10);

        // 1. අද දවසට අදාල Templates ටික හොයනවා (DAILY ඒවා සහ අද Date එකට සෙට් වෙන ඒවා)
        const templates = await prismaTaskGen.customTaskTemplate.findMany({
            where: {
                OR: [
                    { allocationType: 'DAILY' },
                    { dayOfMonth: todayDay }
                ]
            }
        });

        if (templates.length === 0) {
            console.log("✅ No custom tasks scheduled for today.");
            return;
        }

        let createdCount = 0;

        // 2. ඒ Templates ටිකෙන් අදට අදාල Tasks හදනවා
        // 2. ඒ Templates ටිකෙන් අදට අදාල Tasks හදනවා
        for (const t of templates) {
            // 🔥 ME KALLA ADD KARANNA (Time eke length eka 5k karanawa e.g., 9:30 -> 09:30)
            const safeMainEndTime = t.endTime.length === 5 ? t.endTime : `0${t.endTime}`.slice(-5);
            const deadline = new Date(`${datePrefix}T${safeMainEndTime}:00+05:30`);

            // Main Task එක හදනවා
            const mainTask = await prismaTaskGen.task.create({
                data: {
                    businessId: t.businessId,
                    taskType: "CUSTOM",
                    customTitle: t.title,
                    customDesc: t.description,
                    assignedTo: t.autoAssignTo || null,
                    status: t.autoAssignTo ? "IN_PROGRESS" : "PENDING",
                    deadline: deadline
                }
            });

            // 3. Sub-Tasks (Checklist Items) තියෙනවද බලලා ඒවා හදනවා
            if (t.subTasks) {
                const subTasksArray = typeof t.subTasks === 'string' ? JSON.parse(t.subTasks) : t.subTasks;

                if (Array.isArray(subTasksArray) && subTasksArray.length > 0) {
                    const subsData = subTasksArray.map(sub => {
                        // 🔥 Sub task eketath time format eka hadanawa
                        const safeSubEndTime = sub.endTime.length === 5 ? sub.endTime : `0${sub.endTime}`.slice(-5);
                        return {
                            businessId: t.businessId,
                            taskType: "CUSTOM",
                            customTitle: sub.title,
                            parentId: mainTask.id,
                            deadline: new Date(`${datePrefix}T${safeSubEndTime}:00+05:30`),
                            assignedTo: t.autoAssignTo || null,
                            status: t.autoAssignTo ? "IN_PROGRESS" : "PENDING"
                        };
                    });
                    await prismaTaskGen.task.createMany({ data: subsData });
                }
            }
            createdCount++;
        }

        console.log(`🎉 Successfully generated ${createdCount} Custom Tasks for today!`);
    } catch (error) {
        console.error("❌ Error in Daily Custom Task Generator:", error);
    }
});

// ==========================================================
// 🔥 AUTO ROUND PUSH FOR ALL INQUIRIES (CRON JOB) 🔥
// ==========================================================
// හැමදාම රෑ 12:10 ට මේක Auto Run වෙනවා
cron.schedule('10 0 * * *', async () => {
    console.log("⏰ Running Daily Auto Round Push (5-Day & 7-Day Rules)...");
    try {
        const now = new Date();
        const fiveDaysAgo = new Date(now.getTime() - (5 * 24 * 60 * 60 * 1000));
        const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

        const leadsToPush = await prismaTaskGen.lead.findMany({
            where: {
                campaignType: 'AFTER_SEMINAR',
                inquiryType: { in: ['NEW_INQ', 'OPEN_SEMINAR'] },
                enrollmentStatus: { not: 'ENROLLED' },
                coordinationRound: { in: [1, 2] },
                OR: [
                    { phase: 1, callStatus: 'answered' },
                    { phase: 2, callStatus: { in: ['answered', 'no_answer'] } },
                    { phase: 3 } 
                ],
                updatedAt: { lte: fiveDaysAgo } // දවස් 5ක් පැනපු ඔක්කොම ගන්නවා
            }
        });

        if (leadsToPush.length === 0) {
            console.log("✅ No leads found for Auto Round Push today.");
            return;
        }

        let updatedCount = 0;

        for (const lead of leadsToPush) {
            const currentRound = lead.coordinationRound || 1;
            const isNewInq = lead.inquiryType === 'NEW_INQ';

            // 🔥 NEW_INQ Round 2 එකට දවස් 7ක් යන්න ඕනේ!
            if (isNewInq && currentRound === 2) {
                const leadDate = new Date(lead.updatedAt).getTime();
                if (leadDate > sevenDaysAgo.getTime()) {
                    continue; // තාම දවස් 7ක් පිරිලා නෑ, skip කරනවා
                }
            }

            // 1. Save history to LeadRoundProgress before changing round
            await prismaTaskGen.leadRoundProgress.create({
                data: {
                    leadId: lead.id,
                    round: currentRound,
                    callStatus: lead.callStatus || 'pending',
                    callMethod: lead.callMethod || 'direct',
                    callAttempt: lead.callAttempt || 1,
                    feedback: lead.feedback || 'Auto pushed to next round'
                }
            });

            // 2. Update the existing lead (NO DUPLICATES!)
            if (currentRound === 1) {
                // Round 1 -> Round 2
                await prismaTaskGen.lead.update({
                    where: { id: lead.id },
                    data: {
                        coordinationRound: 2,
                        phase: 1,
                        callStatus: 'pending',
                        callAttempt: 1,
                        isLocked: false,
                        feedback: 'Auto pushed from Round 1',
                        updatedAt: new Date()
                    }
                });
            } else if (currentRound === 2) {
                // Round 2 -> NON_PAID (NORMAL)
                await prismaTaskGen.lead.update({
                    where: { id: lead.id },
                    data: {
                        inquiryType: 'NORMAL', // Move to Non Paid campaign
                        coordinationRound: 1,  // Reset round for Non Paid
                        phase: 1,
                        callStatus: 'pending',
                        callAttempt: 1,
                        isLocked: false,
                        feedback: `Auto pushed from Round 2 to Non-${isNewInq ? 'Enrolled' : 'Paid'}`,
                        updatedAt: new Date()
                    }
                });
            }
            updatedCount++;
        }

        console.log(`🎉 Successfully Pushed ${updatedCount} Leads to the Next Round!`);
    } catch (error) {
        console.error("❌ Error in Auto Round Push Generator:", error);
    }
});