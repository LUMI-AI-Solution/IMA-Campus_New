const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany();
    const kavishka = users.filter(u => (u.firstName && u.firstName.toLowerCase().includes('kavishka')) || (u.lastName && u.lastName.toLowerCase().includes('kavishka')));
    console.log("Kavishka:", kavishka.map(u => ({ id: u.id, name: u.firstName + ' ' + u.lastName })));
    
    const leads = await prisma.lead.findMany({
        where: { phone: { contains: '766231613' } }
    });
    console.log("Lead by 766231613:", leads.map(l => ({ id: l.id, inquiryType: l.inquiryType, assignedTo: l.assignedTo, callStatus: l.callStatus, openSemCallStatus: l.openSemCallStatus, openSemPhase: l.openSemPhase, newInqCallStatus: l.newInqCallStatus })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
