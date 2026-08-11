const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Find the latest 50 slips that were updated/processed
    // Since we just ran bulk process, they should be the most recently updated
    const recentSlips = await prisma.payment.findMany({
        where: {
            slip_image: { not: null },
            remark: { not: null, not: "" }
        },
        orderBy: { updatedAt: 'desc' },
        take: 45,
        include: {
            student: true
        }
    });

    const report = {
        totalFailed: recentSlips.length,
        reasons: {}
    };

    recentSlips.forEach(slip => {
        let remark = slip.remark;
        // Clean up the remark to group them
        if (remark.includes('No Google Sheet records')) {
            remark = 'Data Match Not Found: No Google Sheet records found for date/amount';
        } else if (remark.includes('[AI Skipped]')) {
            remark = remark.substring(0, 80) + '...'; // truncate for grouping
        } else if (remark.includes('Failed to verify due to AI Error')) {
            remark = 'AI Error or OCR failed to extract data';
        } else if (remark.includes('Amount mismatch')) {
            remark = 'Amount mismatch between slip and sheet';
        } else if (remark.includes('Date mismatch')) {
            remark = 'Date mismatch between slip and sheet';
        }
        
        if (!report.reasons[remark]) {
            report.reasons[remark] = [];
        }
        report.reasons[remark].push(`ID: ${slip.id} | Amount: ${slip.amount} | Date: ${slip.date} | Ref: ${slip.ref_id} | Name: ${slip.student ? slip.student.firstName + ' ' + slip.student.lastName : 'Unknown'}`);
    });

    console.log(JSON.stringify(report, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
