const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const query = "62443605";
  
  // Search in Lead
  const leads = await prisma.lead.findMany({
    where: {
      OR: [
        { phone: { contains: query } }
      ]
    }
  });
  console.log("Found Leads:", leads.map(l => ({ id: l.id, phone: l.phone, name: l.name })));

  // Search in Payment
  const payments = await prisma.payment.findMany({
    where: {
      OR: [
        { payhereOrderId: { contains: query } },
        { refNo: { contains: query } },
        { invoiceNo: { contains: query } }
      ]
    },
    include: {
      lead: { select: { id: true, name: true, phone: true } }
    }
  });
  console.log("Found Payments:", payments);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
