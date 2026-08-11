const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.batch.findUnique({ where: { id: 26 } })
.then(b => console.log(b))
.finally(() => prisma.$disconnect());
