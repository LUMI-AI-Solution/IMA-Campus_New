const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const key1 = 'AIzaSyAZi6iT7RDPC2ti3qzOjGss3WwLWXQeBhY';
        const key2 = 'AIzaSyADboMWVdCCAwbfMGZnyXxk_CUYx3PALyY';

        await prisma.appSetting.upsert({
            where: { key: 'GEMINI_API_KEY' },
            update: { value: key1 },
            create: { key: 'GEMINI_API_KEY', value: key1 }
        });

        await prisma.appSetting.upsert({
            where: { key: 'GEMINI_API_KEY_2' },
            update: { value: key2 },
            create: { key: 'GEMINI_API_KEY_2', value: key2 }
        });

        console.log("Successfully updated GEMINI_API_KEY and GEMINI_API_KEY_2 in the database!");
    } catch (error) {
        console.error("Error updating keys:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
