const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const students = await prisma.user.findMany({
        where: {
            OR: [
                { phone: { contains: '769912192' } },
                { whatsapp: { contains: '769912192' } },
                { firstName: { contains: 'Chamodya' } }
            ]
        },
        include: { payments: { include: { business: true, batch: true }, orderBy: { created_at: 'desc' } } }
    });
    
    students.forEach(s => {
        console.log(`Student ID: ${s.id}, Name: ${s.firstName} ${s.lastName}, Phone: ${s.phone}, WhatsApp: ${s.whatsapp}`);
        console.log(`Payments count: ${s.payments.length}`);
        s.payments.forEach(p => {
            console.log(`  Payment ID: ${p.id}, Status: ${p.status}, Subjects: ${p.subjects}`);
        });
    });
}
main().catch(console.error).finally(() => prisma.$disconnect());
