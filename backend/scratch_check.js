const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const p = await prisma.payment.findMany({ where: { slip_image: { not: null } }, orderBy: { created_at: 'desc' }, take: 200 });
    console.log('Top 200 payments with slip_image, pending count:', p.filter(x => x.status === 0).length);
}
main().finally(() => {
    prisma.$disconnect();
    process.exit(0);
});
