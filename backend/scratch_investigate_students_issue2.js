const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const ids = ["414401", "18096874"];
    for (const val of ids) {
        console.log(`\n--- Searching for ${val} ---`);
        let user;
        
        // Try as phone number
        user = await prisma.user.findFirst({
            where: { phone: { contains: val } },
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
        
        if (!user) {
            // Try as ID if it's a number
            if (!isNaN(parseInt(val))) {
                user = await prisma.user.findFirst({
                    where: { id: parseInt(val) },
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
            }
        }
        
        if (user) {
            console.log("Found User:");
            console.log("ID:", user.id, "Phone:", user.phone, "Name:", user.name);
            console.log("Recent Payments:");
            console.dir(user.payments, { depth: null });
            
            console.log("\nRecent Deliveries:");
            console.dir(user.deliveries, { depth: null });
        } else {
            console.log("User not found for", val);
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
