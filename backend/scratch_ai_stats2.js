const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const verified = await prisma.payment.count({ where: { aiVerified: true } });
  const failed = await prisma.payment.count({ where: { aiVerified: false, aiConfidence: { not: null } } });
  const auditLogs = await prisma.paymentAuditLog.count({ where: { action: { contains: 'AI' } } });
  console.log(`Verified: ${verified}, Failed/Low Confidence: ${failed}`);
  console.log(`AI Audit Logs: ${auditLogs}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
