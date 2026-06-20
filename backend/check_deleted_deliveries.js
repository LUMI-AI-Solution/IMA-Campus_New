const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const upgradePayments = await prisma.payment.findMany({
    where: { remark: { contains: '[UPGRADE]' } }
  });
  
  for (const payment of upgradePayments) {
    // Check if there is ANY delivery for this student for the exact same batch/business
    const deliveries = await prisma.delivery.findMany({
      where: { 
        studentId: payment.studentId.toString(),
        businessId: payment.businessId
      },
      include: {
        payment: true
      }
    });
    
    console.log(`Student ${payment.studentId}: ${deliveries.length} total deliveries. Payment 1st type: ${deliveries[0] ? deliveries[0].payment.payment_type : 'None'}`);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
