const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const staff = await prisma.user.findMany();
    for (const s of staff) {
        if (s.businessType && s.businessType.includes("  ")) {
           // just logging for now, wait it's not double space, it's trailing space before a comma
        }
        if (s.businessType) {
            const types = s.businessType.split(',').map(x => x.trim()).filter(Boolean);
            const original = s.businessType;
            const newTypesStr = types.join(', ');
            if (original !== newTypesStr) {
                console.log(`Updating staff ${s.id}: "${original}" -> "${newTypesStr}"`);
                await prisma.user.update({
                    where: { id: s.id },
                    data: { businessType: newTypesStr }
                });
            }
        }
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
