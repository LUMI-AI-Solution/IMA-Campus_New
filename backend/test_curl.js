const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

async function main() {
  const admin = await prisma.user.findFirst();
  const token = jwt.sign({ id: admin.id, role: admin.role, businessId: admin.businessId }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1d' });
  console.log(token);
  await prisma.$disconnect();
}
main();
