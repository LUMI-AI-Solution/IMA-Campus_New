const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const phones = [
        '94702975265', '94706100888', '94785406595', '94775702176',
        '94764989498', '94740048543', '94717794075', '94775224295'
    ];
    
    for (const phone of phones) {
        const leads = await prisma.lead.findMany({
            where: { phone: { contains: phone }, batchId: 40 },
            select: { 
                id: true, phone: true, name: true, 
                batchId: true, inquiryType: true,
                feedback: true, openSemFeedback: true, newInqFeedback: true,
                createdAt: true, updatedAt: true
            }
        });
        console.log(`Leads for ${phone} in Batch 40:`);
        console.log(leads);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
