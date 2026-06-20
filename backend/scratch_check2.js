const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const p1 = await prisma.payment.findMany({ where: { status: 0 } });
    console.log(`Total Pending (status=0): ${p1.length}`);
    const slips = await prisma.payment.findMany({ where: { status: 0, slip_image: { not: null } } });
    console.log(`Total Pending with slip_image: ${slips.length}`);
    slips.forEach(p => console.log(`  ID: ${p.id}, Image: ${p.slip_image.substring(0,20)}`));
}
main().finally(() => {
    prisma.$disconnect();
    process.exit(0);
});
