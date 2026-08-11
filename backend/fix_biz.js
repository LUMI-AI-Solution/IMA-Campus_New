const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const biz = await prisma.business.findMany();
    for (const b of biz) {
        if (b.name !== b.name.trim()) {
            await prisma.business.update({
                where: { id: b.id },
                data: { name: b.name.trim() }
            });
            console.log(`Trimmed business ID ${b.id}`);
        }
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
