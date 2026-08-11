const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const history = await prisma.aiVerificationHistory.aggregate({
    _sum: {
      processed: true,
      success: true,
      failed: true
    }
  });
  console.log("AI Verification History Totals:", history._sum);

  const aiVerifiedPayments = await prisma.payment.count({
    where: {
      aiVerified: true
    }
  });
  console.log("Payments with aiVerified=true:", aiVerifiedPayments);
}

main().catch(console.error).finally(() => prisma.$disconnect());
