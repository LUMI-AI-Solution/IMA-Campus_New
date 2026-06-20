const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRaw`UPDATE \`Lead\` SET lastMessageAt = updatedAt WHERE lastMessageAt IS NULL;`;
  console.log("Backfill complete");
}
main().catch(console.error).finally(() => prisma.$disconnect());
