const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncTutes() {
    console.log("Starting Tute Sync...");
    let setting = await prisma.appSetting.findUnique({ where: { key: 'MASTER_TUTES' } });
    let masterData = setting ? JSON.parse(setting.value) : [];

    const allStocks = await prisma.tuteStock.findMany({
        include: {
            course: true
        }
    });

    let updated = false;

    for (const stock of allStocks) {
        let lecturer = stock.course?.lecturerName || "Unknown Lecturer";
        let tuteName = stock.tuteName;
        let tuteImage = stock.tuteImage || 'default-tute.png';

        let lecIndex = masterData.findIndex(l => l.name === lecturer);
        if (lecIndex !== -1) {
            if (!masterData[lecIndex].tutes) masterData[lecIndex].tutes = [];
            if (!masterData[lecIndex].tutes.some(t => t.name === tuteName)) {
                console.log(`Adding ${tuteName} to ${lecturer}`);
                masterData[lecIndex].tutes.push({
                    id: Date.now() + Math.random().toString(),
                    name: tuteName,
                    image: tuteImage
                });
                updated = true;
            }
        } else {
            console.log(`Creating new lecturer ${lecturer} and adding ${tuteName}`);
            masterData.push({
                id: Date.now().toString(),
                name: lecturer,
                image: null,
                tutes: [{
                    id: Date.now() + Math.random().toString(),
                    name: tuteName,
                    image: tuteImage
                }]
            });
            updated = true;
        }
    }

    if (updated) {
        await prisma.appSetting.upsert({
            where: { key: 'MASTER_TUTES' },
            update: { value: JSON.stringify(masterData) },
            create: { key: 'MASTER_TUTES', value: JSON.stringify(masterData) }
        });
        console.log("Sync Complete. Updated MASTER_TUTES in DB.");
    } else {
        console.log("No new tutes to sync.");
    }
}

syncTutes().catch(console.error).finally(() => process.exit(0));
