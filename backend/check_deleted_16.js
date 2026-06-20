const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function main() {
  const paymentIds = [1066,1071,1125,1188,1193,1245,1273,1276,1292,1293,1309,1316,1350,1356,1360,1371,1385];
  
  const payments = await prisma.payment.findMany({
    where: { id: { in: paymentIds } },
    include: {
      student: true,
      batch: true
    }
  });

  console.log(`Found ${payments.length} payments related to deleted deliveries.\n`);

  for (const p of payments) {
    if (!p.student) continue;
    
    // Check if there is another delivery still existing for this student
    const existingDeliveries = await prisma.delivery.findMany({
      where: { studentId: p.student.id.toString(), businessId: p.businessId },
      include: { items: true }
    });

    console.log(`-------------------------------------------------`);
    console.log(`Student: ${p.student.firstName} ${p.student.lastName} (ID: ${p.student.id}) | Phone: ${p.student.phone}`);
    console.log(`Batch: ${p.batch ? p.batch.name : 'Unknown'}`);
    console.log(`Deleted Delivery was for Payment ID: ${p.id} (Amount: ${p.amount}, Type: ${p.payment_type})`);
    
    if (existingDeliveries.length > 0) {
      console.log(`Still Existing Deliveries for this student: ${existingDeliveries.length}`);
      existingDeliveries.forEach(d => {
        console.log(`  -> Delivery ID: ${d.id} | Status: ${d.status} | Tracking: ${d.trackingNumber || 'N/A'}`);
      });
    } else {
      console.log(`NO existing deliveries found for this student anymore!`);
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
