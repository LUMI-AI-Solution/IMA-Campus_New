const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const leads = await prisma.lead.findMany({
    where: { phone: { contains: '000000008' } },
    select: { phone: true, source: true, enrollmentStatus: true, paymentIntention: true, id: true, assignedTo: true, inquiryType: true }
  });
  console.log(leads);
}
main().finally(() => prisma.$disconnect());
