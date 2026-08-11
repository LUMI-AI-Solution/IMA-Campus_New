const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const inqTypes = await prisma.lead.groupBy({
        by: ['inquiryType']
    });
    console.log("Inquiry Types:", inqTypes);
    
    const statuses = await prisma.lead.groupBy({
        by: ['enrollmentStatus']
    });
    console.log("Enrollment Statuses:", statuses);
}
main().catch(console.error).finally(() => prisma.$disconnect());
