const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function exportDetails() {
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

    let output = "Payment ID\tAmount\tStudent Name\tPhone Number\tBusiness\tBatch\tRemarks (To help find the row)\n";

    payments.forEach(p => {
        const sName = p.student ? `${p.student.firstName} ${p.student.lastName}` : 'N/A';
        const sPhone = p.student ? p.student.phone : 'N/A';
        const bizName = p.business ? p.business.name : 'N/A';
        const batchName = p.batch ? p.batch.name : 'N/A';
        
        let shortRemark = p.remark ? p.remark.replace(/\n/g, ' ') : '';
        if (shortRemark.length > 50) shortRemark = shortRemark.substring(0, 50) + '...';

        output += `${p.id}\t${p.amount}\t${sName}\t${sPhone}\t${bizName}\t${batchName}\t${shortRemark}\n`;
    });

    fs.writeFileSync('missing_student_details.tsv', output);
    console.log(`Exported details of ${payments.length} students to missing_student_details.tsv`);
}

exportDetails()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
