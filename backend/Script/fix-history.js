// fix-history.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runDataMigration() {
    console.log("==================================================");
    console.log("🚀 STARTING 10000% SAFE HISTORICAL DATA RECOVERY...");
    console.log("==================================================");

    try {
        console.log("🚀 Script Disabled: Do not create _HISTORY_ROUND_ duplicate leads.");

    } catch (error) {
        console.error("❌ ERROR DURING MIGRATION:", error);
    } finally {
        // වැඩේ ඉවර වුනාම Database Connection එක වහනවා
        await prisma.$disconnect();
    }
}

// Function එක Call කරනවා
runDataMigration();