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

        res.json({
            grossRevenue: paymentsCount * 1000, // Dummy calc for visual
            verifiedSales: paymentsCount,
            pendingSync: 0,
            failed: 0,
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