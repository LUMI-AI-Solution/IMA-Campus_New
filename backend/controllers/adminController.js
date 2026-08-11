const mysqldump = require('mysqldump');
const fs = require('fs');
const path = require('path');

// ==========================================
// FULL SQL DATABASE BACKUP
// ==========================================
exports.downloadDatabaseBackup = async (req, res) => {
    try {
        const BACKUP_DIR = path.join(__dirname, '../backups');
        if (!fs.existsSync(BACKUP_DIR)) {
            return res.status(404).json({ error: "No automated backups found yet." });
        }

        const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.sql'));
        if (files.length === 0) {
            return res.status(404).json({ error: "No automated backups found yet." });
        }

        // Get the latest backup
        const latestBackup = files.sort().reverse()[0];
        const dumpPath = path.join(BACKUP_DIR, latestBackup);

        res.download(dumpPath, latestBackup, (err) => {
            if (err) console.error("Backup download error:", err);
        });
    } catch (error) {
        console.error("Database backup failed:", error);
        res.status(500).json({ error: "Failed to download database backup" });
    }
};

const os = require('os');
const { exec } = require('child_process');

exports.getSystemOverview = async (req, res) => {
    try {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        // Safe fetch of simple stats
        const paymentsCount = await prisma.payment.count();
        const leadsCount = await prisma.lead.count();
        const usersCount = await prisma.user.count();

        // Calculate simple server stats
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMemPct = Math.round(((totalMem - freeMem) / totalMem) * 100);
        
        // Simple CPU load average (1 minute)
        const loadAvg = os.loadavg()[0];
        const cpuCount = os.cpus().length;
        const cpuLoadPct = Math.round((loadAvg / cpuCount) * 100);

        // Calculate recent errors from PM2 error log
        let recentErrorsCount = 0;
        try {
            const errPath = path.join(os.homedir(), '.pm2/logs/ima-backend-error.log');
            if (fs.existsSync(errPath)) {
                const errLogs = fs.readFileSync(errPath, 'utf8').split('\n');
                recentErrorsCount = errLogs.filter(line => line.toLowerCase().includes('error')).length;
            }
        } catch(e) {
            console.error("Failed to read error logs for overview", e);
        }

        res.json({
            grossRevenue: paymentsCount * 1000, // Dummy calc for visual
            verifiedSales: paymentsCount,
            pendingSync: 0,
            failed: recentErrorsCount,
            pieData: [
                { name: 'Verified', value: paymentsCount || 100 },
                { name: 'Pending', value: 45 },
                { name: 'Failed', value: 12 }
            ],
            barData: [
                { name: 'Courses', revenue: 450000 }
            ],
            services: [
                { name: "Live API Server", status: "LIVE", totalLeads: leadsCount, healthScore: 100 },
                { name: "Database Nodes", status: "LIVE", totalLeads: usersCount, healthScore: 100 }
            ],
            serverHealth: {
                cpuUsage: Math.min(cpuLoadPct, 100),
                ramUsage: usedMemPct
            }
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to load overview data" });
    }
};

exports.getLiveLogs = (req, res) => {
    // Tail the last 50 lines of PM2 backend log
    const logPath = path.join(os.homedir(), '.pm2/logs/ima-backend-out.log');
    const errPath = path.join(os.homedir(), '.pm2/logs/ima-backend-error.log');
    
    let combinedLogs = "";

    try {
        if (fs.existsSync(logPath)) {
            const outLogs = fs.readFileSync(logPath, 'utf8').split('\n').slice(-30).join('\n');
            combinedLogs += "=== STANDARD OUTPUT ===\n" + outLogs + "\n";
        }
        if (fs.existsSync(errPath)) {
            const errLogs = fs.readFileSync(errPath, 'utf8').split('\n').slice(-30).join('\n');
            combinedLogs += "=== ERROR OUTPUT ===\n" + errLogs + "\n";
        }
        res.send(combinedLogs || "No logs available.");
    } catch (e) {
        res.status(500).send("Error reading logs");
    }
};
// ==========================================
// SYSTEM AUDIT LOGS
// ==========================================
exports.getAuditLogs = async (req, res) => {
    try {
        const { password, page = 1, limit = 50 } = req.body;
        
        // Security checks
        const userRole = (req.user?.role || req.query.loggedUserRole || '').toUpperCase();
        if (userRole !== 'SYSTEM_ADMIN') {
            return res.status(403).json({ error: "Access Denied: Requires SYSTEM_ADMIN role." });
        }
        
        if (password !== 'IMAAT@2026') {
            return res.status(401).json({ error: "Incorrect Security Password." });
        }

        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        const offset = (page - 1) * limit;

        const logs = await prisma.systemAuditLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit),
            skip: offset,
            include: {
                user: {
                    select: { firstName: true, lastName: true, phone: true }
                }
            }
        });

        const totalLogs = await prisma.systemAuditLog.count();

        res.status(200).json({
            logs,
            totalPages: Math.ceil(totalLogs / limit),
            currentPage: parseInt(page),
            totalLogs
        });
    } catch (error) {
        console.error("Audit log fetch error:", error);
        res.status(500).json({ error: "Failed to fetch audit logs" });
    }
};

exports.getAdminProfile = async (req, res) => {
    try {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        const userId = req.user.id || req.user.userId;
        if (!req.user || !userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const profile = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
                agentStatus: true,
            }
        });

        if (!profile) {
            return res.status(404).json({ error: "Profile not found" });
        }

        res.status(200).json({ success: true, profile });
    } catch (error) {
        console.error("Failed to fetch admin profile:", error);
        res.status(500).json({ error: "Failed to load admin profile" });
    }
};
