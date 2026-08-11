const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const batches = await prisma.batch.findMany({
        where: {
            name: {
                contains: "2027 AUGUST Intake"
            },
            business: {
                name: {
                    contains: "Commerce"
                }
            }
        },
        include: {
            business: true
        }
    });
    console.log(JSON.stringify(batches, null, 2));

    // Also let's find the business for commerce
    const businesses = await prisma.business.findMany({
        where: {
            name: {
                contains: "Commerce"
            }
        }
    });
    console.log("Businesses:", JSON.stringify(businesses, null, 2));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
