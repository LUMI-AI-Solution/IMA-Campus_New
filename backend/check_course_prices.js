const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const courses = await prisma.course.findMany({
        where: { id: { in: [1075, 1076, 1077] } }
    });
    
    courses.forEach(c => {
        console.log(`Course ${c.id}: ${c.name}`);
        if (c.groupPrices) {
            try {
                const gps = JSON.parse(c.groupPrices);
                const match = gps.find(g => g.groupId == 208); // group ID is 208 for Payment 4343
                if (match) {
                    console.log(`  Match for group 208:`, match);
                } else {
                    console.log(`  No match for group 208 in groupPrices.`);
                }
            } catch (e) {
                console.log(`  Error parsing groupPrices for course ${c.id}`);
            }
        } else {
            console.log(`  No groupPrices defined.`);
        }
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
