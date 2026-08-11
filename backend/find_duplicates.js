const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function findDuplicates() {
  console.log("Fetching all users...");
  const users = await prisma.user.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      whatsapp: true,
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
  let markdownReport = `# Duplicate Accounts Report\n\n`;
  markdownReport += `This report lists user accounts that have the same normalized phone number or WhatsApp number.\n\n`;

  for (const [phone, userList] of normalizedPhoneMap.entries()) {
    // Unique users only (in case phone and whatsapp are both matched)
    const uniqueUsers = Array.from(new Map(userList.map(u => [u.id, u])).values());
    
    if (uniqueUsers.length > 1) {
      duplicateCount++;
      markdownReport += `### Normalized Phone: ${phone}\n`;
      markdownReport += `| User ID | Name | Phone | WhatsApp |\n`;
      markdownReport += `|---------|------|-------|----------|\n`;
      for (const u of uniqueUsers) {
        markdownReport += `| ${u.id} | ${u.firstName} ${u.lastName || ''} | ${u.phone || '-'} | ${u.whatsapp || '-'} |\n`;
      }
      markdownReport += `\n`;
    }
  }

  markdownReport += `\n**Total Duplicate Groups:** ${duplicateCount}\n`;
  fs.writeFileSync('/root/.gemini/antigravity-ide/brain/3578701b-a635-4aad-ac1f-be9ca5235f66/duplicate_accounts_report.md', markdownReport);
  console.log("Done. Found " + duplicateCount + " duplicate groups.");
}

findDuplicates().catch(console.error).finally(() => prisma.$disconnect());
