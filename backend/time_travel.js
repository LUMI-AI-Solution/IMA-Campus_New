const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log("Usage: node time_travel.js <phone_suffix> <days_to_go_back>");
    console.log("Example: node time_travel.js 771234567 5");
    process.exit(1);
  }

  const phoneSuffix = args[0];
  const days = parseFloat(args[1]);

  const leads = await prisma.lead.findMany({
    where: { phone: { contains: phoneSuffix } }
  });

  if (leads.length === 0) {
    console.log(`No lead found containing phone: ${phoneSuffix}`);
    return;
  }

  const lead = leads[0];
  console.log(`Found Lead: ${lead.name} (${lead.phone})`);
  
  const pastDate = new Date();
  pastDate.setHours(pastDate.getHours() - (days * 24));

  console.log(`Time traveling... Setting timestamps to: ${pastDate.toLocaleString()}`);

  // Using raw SQL to avoid Prisma's @updatedAt overriding the date
  await prisma.$executeRaw`
    UPDATE \`Lead\` 
    SET createdAt = ${pastDate}, updatedAt = ${pastDate}, newInqTimestamp = ${pastDate}
    WHERE id = ${lead.id}
  `;

  console.log("✅ Time travel successful! Refresh your CRM to see the effect.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
