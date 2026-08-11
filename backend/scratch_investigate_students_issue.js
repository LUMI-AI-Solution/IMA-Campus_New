const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const studentIds = ["414401", "18096874"];
    for (const sid of studentIds) {
        console.log(`\n--- Investigating Student ${sid} ---`);
        const student = await prisma.student.findUnique({
            where: { studentId: sid },
            include: {
                payments: {
                    orderBy: { createdAt: 'desc' },
                    take: 5
                },
                deliveries: {
                    orderBy: { createdAt: 'desc' },
                    take: 5
                }
            }
        });
        
        if (!student) {
            console.log("Student not found");
            continue;
        }
        
        console.log("Recent Payments:");
        console.dir(student.payments, { depth: null });
        
        console.log("\nRecent Deliveries:");
        console.dir(student.deliveries, { depth: null });
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
