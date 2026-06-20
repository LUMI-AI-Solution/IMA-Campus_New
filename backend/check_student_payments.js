const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const p = await prisma.payment.findUnique({
        where: { id: 71 },
        include: {
            actionedUser: true
        }
    });
    console.log("=== Payment 71 actioned by ===");
    console.log(JSON.stringify(p ? {
        id: p.id,
        status: p.status,
        actionedById: p.actionedById,
        actionedUser: p.actionedUser ? { id: p.actionedUser.id, name: p.actionedUser.firstName + " " + p.actionedUser.lastName, role: p.actionedUser.role } : null,
        updatedAt: p.updatedAt // Wait, does payment have updatedAt? Let's check schema. No, payment does not have updatedAt.
    } : null, null, 2));
}

check().finally(() => prisma.$disconnect());
