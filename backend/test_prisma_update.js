const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    try {
        const res = await prisma.course.updateMany({
            where: { lecturerName: '' },
            data: { lecturerName: 'Test Fix 123' }
        });
        console.log("Success:", res);
    } catch(e) {
        console.error("Error:", e);
    }
}
test();
