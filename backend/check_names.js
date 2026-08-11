const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const stocks = await prisma.tuteStock.findMany({
        include: { course: true }
    });
    const map = {};
    for (let s of stocks) {
        const key = `${s.course?.lecturerName} - ${s.tuteName}`;
        if (!map[key]) map[key] = [];
        map[key].push(s);
    }
    
    for (const [k, v] of Object.entries(map)) {
        if (v.length > 1) {
            console.log(`Duplicate Key: ${k}, Count: ${v.length}`);
            v.forEach(x => console.log(`   ID: ${x.id}, Name: "${x.tuteName}", Course: ${x.courseId}`));
        }
    }
}
main().finally(() => prisma.$disconnect());
