const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const studentIdStr = "2024";
    const groupId = 208;

    const ext = await prisma.delivery.findFirst({
        where: { 
            studentId: studentIdStr, 
            paymentType: 'Monthly', 
            payment: { groupId: groupId } 
        },
        include: {
            payment: true,
            items: true
        }
    });

    console.log("Existing delivery:", JSON.stringify(ext, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
