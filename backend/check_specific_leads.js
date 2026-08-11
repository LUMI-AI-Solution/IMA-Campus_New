const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const phones = [
        '94702975265', '94706100888', '94785406595', '94775702176',
        '94764989498', '94740048543', '94717794075', '94775224295'
    ];
    
    for (const phone of phones) {
        const lead = await prisma.lead.findFirst({
            where: { phone: { contains: phone } },
            select: { 
                id: true, phone: true, name: true, 
                batchId: true, inquiryType: true,
                createdAt: true, updatedAt: true,
                coordinationRound: true, phase: true,
                openSemRound: true, openSemPhase: true,
                newInqRound: true, newInqPhase: true,
                feedback: true, openSemFeedback: true, newInqFeedback: true
            }
        });
        console.log(lead);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
