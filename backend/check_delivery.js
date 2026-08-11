const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const studentIds = [414401, 18096874]; // Maybe these are IDs or phones
    
    // Check if these are student IDs
    const users = await prisma.user.findMany({
        where: { id: { in: studentIds } },
        include: {
            payments: {
                orderBy: { id: 'desc' },
                take: 5,
                include: {
                    delivery: {
                        include: { items: true }
                    }
                }
            }
        }
    });

    console.log("Users by ID:");
    console.log(JSON.stringify(users, null, 2));

    // If not found by ID, maybe they are phone numbers or part of phone numbers
    const usersByPhone = await prisma.user.findMany({
        where: {
            OR: studentIds.map(id => ({ phone: { contains: id.toString() } }))
        },
        include: {
            payments: {
                orderBy: { id: 'desc' },
                take: 5,
                include: {
                    delivery: {
                        include: { items: true }
                    }
                }
            }
        }
    });

    if (usersByPhone.length > 0) {
        console.log("Users by Phone:");
        console.log(JSON.stringify(usersByPhone, null, 2));
    }
}

check().catch(console.error).finally(() => prisma.$disconnect());
