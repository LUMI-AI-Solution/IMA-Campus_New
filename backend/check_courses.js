const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
    const courses = await prisma.course.findMany({ where: { name: { contains: 'Political' } } });
    const unique = [];
    for (const c of courses) {
        if (!unique.find(u => u.name === c.name)) {
            unique.push(c);
        }
    }
    
    unique.forEach(c => {
        console.log('Course Name:', c.name);
        try {
            const parsed = JSON.parse(c.groupPrices || '[]');
            const g12 = parsed.find(p => p.groupId == 12 || p.groupId == "12");
            console.log('Group 12 tutes length:', g12 ? (g12.tutes ? g12.tutes.length : 'no tutes array') : 'no group 12');
        } catch (e) {
            console.log('Error parsing groupPrices', e.message);
        }
    });
    process.exit(0);
}
run();
