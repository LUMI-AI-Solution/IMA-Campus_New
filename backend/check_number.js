const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNumber() {
    try {
        const phone = "94713839496";
        const leads = await prisma.lead.findMany({
            where: {
                phone: {
                    contains: "713839496"
                }
            },
            include: {
                assignedUser: true
            }
        });

        console.log(JSON.stringify(leads, null, 2));

        const users = await prisma.user.findMany({
            where: {
                phone: {
                    contains: "713839496"
                }
            }
        });
        console.log("Students/Users:", JSON.stringify(users, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkNumber();
