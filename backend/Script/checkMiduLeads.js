const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const pricing = await prisma.upgradePricing.findMany();
    console.log("UpgradePricing records:");
    pricing.forEach(p => {
        console.log(`ID: ${p.id}, BatchId: ${p.batchId}, CourseId: ${p.courseId}, PlanType: ${p.planType}, SubjectCount: ${p.subjectCount}, InstallmentNum: ${p.installmentNum}, Amount: ${p.amount}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
