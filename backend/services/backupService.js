const cron = require('node-cron');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.join(__dirname, '../backups');

function runBackup() {
    console.log("[BackupService] Starting automated database backup...");
    
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    // Clean old backups first
    const files = fs.readdirSync(BACKUP_DIR);
    files.forEach(file => {
        if (file.endsWith('.sql')) {
            try {
                fs.unlinkSync(path.join(BACKUP_DIR, file));
                console.log(`[BackupService] Deleted previous backup: ${file}`);
            } catch (err) {
                console.log(`[BackupService] Could not delete ${file}: ${err.message}`);
            }
        }
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `imacampus_backup_${timestamp}.sql`);
    
    // DB Credentials matching the .env
    const cmd = `mysqldump -u ima_admin -p'ImaCampus@2026' imacampus > ${backupFile}`;

    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error(`[BackupService] Backup failed: ${error.message}`);
            return;
        }
        console.log(`[BackupService] Successfully created backup: ${backupFile}`);
    });
}

// Run immediately on start (optional) or wait for cron
// runBackup();

// Schedule every 30 minutes
cron.schedule('*/30 * * * *', () => {
    runBackup();
});

module.exports = { runBackup };
