const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDoubleStringifiedSubjects() {
    try {
        const payments = await prisma.payment.findMany({
            where: {
                subjects: {
                    startsWith: '"['
                }
            }
        });

        console.log(`Found ${payments.length} payments with double stringified subjects.`);

        let fixedCount = 0;
        for (const p of payments) {
            let subjectsStr = p.subjects;
            
            // if it looks like '"[...]"', parse it once to remove the outer stringification
            try {
                const parsedOnce = JSON.parse(subjectsStr);
                if (typeof parsedOnce === 'string' && parsedOnce.startsWith('[')) {
                    await prisma.payment.update({
                        where: { id: p.id },
                        data: { subjects: parsedOnce }
                    });
                    fixedCount++;
                }
            } catch (e) {
                console.error(`Failed to parse subjects for payment ${p.id}: ${e.message}`);
            }
        }

        console.log(`Successfully fixed ${fixedCount} payments.`);
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

fixDoubleStringifiedSubjects();
