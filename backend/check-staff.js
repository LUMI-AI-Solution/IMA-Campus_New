const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStaff() {
    try {
        const staff = await prisma.user.findMany({
            where: { role: { notIn: ['Student', 'USER', 'STUDENT'] } },
            select: { id: true, firstName: true, lastName: true, role: true, businessType: true, department: true }
        });

        console.log(`Total staff members: ${staff.length}`);
        console.log('\nStaff list:');
        staff.forEach(s => {
            console.log(`ID: ${s.id}, Name: ${s.firstName} ${s.lastName}, Role: ${s.role}, BusinessType: ${s.businessType}, Department: ${s.department}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkStaff();
