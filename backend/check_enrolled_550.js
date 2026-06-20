const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const studentId = 550; // Shashika
    
    const validPayments = await prisma.payment.findMany({
        where: { studentId: parseInt(studentId), status: { in: [0, 1, 4] } } 
    });

    let enrolled = [];
    validPayments.forEach(p => {
        if (p.subjects) {
            try { 
                const parsed = JSON.parse(p.subjects);
                enrolled.push(...parsed.map(Number)); 
                enrolled.push(...parsed.map(String)); 
            } catch(e) {
                console.error("Subject Parse Error:", e);
            }
        }
    });

    console.log("Enrolled subjects for 550:", Array.from(new Set(enrolled)));
}
check().catch(console.error).finally(() => prisma.$disconnect());
