const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function run() {
    const timeThreshold = new Date('2026-07-23T05:40:00Z'); // 5:40 UTC
    
    const leads = await prisma.lead.findMany({
        where: {
            enrollmentStatus: 'ENROLLED',
            updatedAt: { gte: timeThreshold }
        },
        include: {
            batch: true,
            assignedUser: true
        }
    });

    const allBusinesses = await prisma.business.findMany();
    const bizMap = {};
    allBusinesses.forEach(b => bizMap[b.id] = b.name);

    let csvContent = "Lead ID,Name,Phone,Status,Payment Intention,Batch,Business,Coordinator Name,Coordinator Phone\n";

    for (const l of leads) {
        const batchName = l.batch ? l.batch.name : 'N/A';
        
        let bizName = 'N/A';
        const match = l.phone.match(/_BIZ_(\d+)/);
        if (match) {
            const bId = parseInt(match[1]);
            bizName = bizMap[bId] || `Business ${bId}`;
        }

        let coordName = 'N/A';
        let coordPhone = 'N/A';
        if (l.assignedUser) {
            coordName = l.assignedUser.name;
            coordPhone = l.assignedUser.phone || 'N/A';
        }
        
        const cleanName = (l.name || '').replace(/"/g, '""');
        csvContent += `"${l.id}","${cleanName}","${l.phone}","${l.enrollmentStatus}","${l.paymentIntention}","${batchName}","${bizName}","${coordName}","${coordPhone}"\n`;
    }

    const filePath = '/root/IMA-Campus/synced_400_enrolled_leads.csv';
    fs.writeFileSync(filePath, "\uFEFF" + csvContent); // BOM for Excel
    console.log("Exported " + leads.length + " leads to " + filePath);
}
run();
