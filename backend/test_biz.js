const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
    const businesses = await prisma.business.findMany({ select: { id: true, name: true, logo: true, ringtone: true } });
    console.log(businesses);
}
test();
