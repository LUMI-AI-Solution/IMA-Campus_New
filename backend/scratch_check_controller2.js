const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({
        where: { phone: { in: ['94710366075_BIZ_1_BATCH_6', '94707458410_BIZ_1_BATCH_6', '94776673959_BIZ_1_BATCH_6', '94703454504_BIZ_1_BATCH_6'] } },
        select: { id: true, phone: true, name: true, inquiryType: true }
    });
    console.log("Found Leads:", leads.length);

    let phoneVariants = [];
    leads.forEach(l => {
        if (!l.phone) return;
        const rawPhone = l.phone.split('_')[0].replace(/[^0-9]/g, '');
        if (rawPhone.length >= 9) {
            const suffix = rawPhone.slice(-9);
            phoneVariants.push(`0${suffix}`, `94${suffix}`, `+94${suffix}`, `${suffix}`);
        }
    });
    phoneVariants = [...new Set(phoneVariants)];

    const registeredUsers = await prisma.user.findMany({
        where: {
            OR: [
                { phone: { in: phoneVariants } },
                { whatsapp: { in: phoneVariants } }
            ]
        },
        select: { phone: true, whatsapp: true, firstName: true, lastName: true, optionalPhone: true }
    });

    await Promise.all(leads.map(async (l, i) => {
        if (l.phone) {
            const rawPhone = l.phone.split('_')[0].replace(/[^0-9]/g, '');
            if (rawPhone.length >= 9) {
                const suffix = rawPhone.slice(-9);
                const rUser = registeredUsers.find(u => 
                    (u.phone && u.phone.endsWith(suffix)) || 
                    (u.whatsapp && u.whatsapp.endsWith(suffix))
                );
                if (rUser) leads[i].registeredUser = rUser;
            }
        }
    }));
    
    console.log(JSON.stringify(leads, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
