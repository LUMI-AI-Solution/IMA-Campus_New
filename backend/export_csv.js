const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function exportDetailsCsv() {
    const payments = await prisma.payment.findMany({
        where: {
            aiVerified: true,
            status: 1
        },
        include: {
            student: true,
            business: true,
            batch: true
        }
    });

    let output = '"Payment ID","Amount","Student Name","Phone Number","Business","Batch","Remarks"\n';

    payments.forEach(p => {
        const sName = p.student ? `${p.student.firstName} ${p.student.lastName}` : 'N/A';
        const sPhone = p.student ? p.student.phone : 'N/A';
        const bizName = p.business ? p.business.name : 'N/A';
        const batchName = p.batch ? p.batch.name : 'N/A';
        
        let shortRemark = p.remark ? p.remark.replace(/\n/g, ' ').replace(/"/g, '""') : '';
        if (shortRemark.length > 80) shortRemark = shortRemark.substring(0, 80) + '...';

        output += `"${p.id}","${p.amount}","${sName}","${sPhone}","${bizName}","${batchName}","${shortRemark}"\n`;
    });

    fs.writeFileSync('missing_student_details.csv', output);
    console.log(`Exported details to missing_student_details.csv`);
}

exportDetailsCsv()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
