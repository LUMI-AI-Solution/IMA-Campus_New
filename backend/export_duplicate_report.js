const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function exportReport() {
  console.log("Fetching all users...");
  const users = await prisma.user.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      whatsapp: true,
      payments: {
        select: {
          id: true,
          amount: true,
          status: true,
          created_at: true,
          slip_image: true,
          method: true,
        }
      }
    }
  });

  const normalizedPhoneMap = new Map();

  const normalize = (phone) => {
    if (!phone) return null;
    let p = phone.replace(/[\s-]/g, '');
    if (p.startsWith('+94')) p = '0' + p.substring(3);
    if (p.startsWith('94') && p.length === 11) p = '0' + p.substring(2);
    return p;
  };

  users.forEach(u => {
    const p1 = normalize(u.phone);
    if (p1) {
      if (!normalizedPhoneMap.has(p1)) normalizedPhoneMap.set(p1, []);
      normalizedPhoneMap.get(p1).push(u);
    }
    const p2 = normalize(u.whatsapp);
    if (p2 && p2 !== p1) {
      if (!normalizedPhoneMap.has(p2)) normalizedPhoneMap.set(p2, []);
      normalizedPhoneMap.get(p2).push(u);
    }
  });

  let duplicateCount = 0;
  
  // CSV Header
  let csvContent = `Group ID,Normalized Phone,User ID,Name,Phone,WhatsApp,Payment ID,Payment Amount,Payment Method,Payment Status,Payment Date,Slip Image\n`;

  let groupId = 1;
  for (const [phone, userList] of normalizedPhoneMap.entries()) {
    const uniqueUsers = Array.from(new Map(userList.map(u => [u.id, u])).values());
    
    if (uniqueUsers.length > 1) {
      duplicateCount++;
      for (const u of uniqueUsers) {
        if (u.payments && u.payments.length > 0) {
          for (const p of u.payments) {
            const dateStr = p.created_at ? p.created_at.toISOString().split('T')[0] : '';
            // Payment status mapped to string for better readability
            let pStatus = 'Pending';
            if (p.status === 1) pStatus = 'Approved';
            else if (p.status === 2) pStatus = 'Rejected';
            
            csvContent += `${groupId},${phone},${u.id},"${u.firstName} ${u.lastName || ''}","${u.phone || '-'}","${u.whatsapp || '-'}","${p.id}","${p.amount}","${p.method}","${pStatus}","${dateStr}","${p.slip_image || '-'}"\n`;
          }
        } else {
            csvContent += `${groupId},${phone},${u.id},"${u.firstName} ${u.lastName || ''}","${u.phone || '-'}","${u.whatsapp || '-'}",No Payments,-,-,-,-,-\n`;
        }
      }
      groupId++;
    }
  }

  // Save to frontend public so they can download it directly via URL
  fs.writeFileSync('/root/IMA-Campus/frontend/public/duplicate_report.csv', csvContent);
  console.log("Done. Saved to /root/IMA-Campus/frontend/public/duplicate_report.csv");
}

exportReport().catch(console.error).finally(() => prisma.$disconnect());
