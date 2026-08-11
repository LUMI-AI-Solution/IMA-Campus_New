const fs = require('fs');
const path = './controllers/dataExportController.js';

let content = fs.readFileSync(path, 'utf8');

// 1. Fix Phone Matching
const oldPhoneLogic = `        // Map phone numbers to find corresponding Users (Students) and Payments
        const enrolledPhones = leads.filter(l => l.enrollmentStatus === 'ENROLLED').map(l => l.phone);
        const students = await prisma.user.findMany({
            where: { phone: { in: enrolledPhones } },
            select: { id: true, phone: true }
        });

        const studentPhoneMap = {};
        students.forEach(s => studentPhoneMap[s.phone] = s.id);`;

const newPhoneLogic = `        // Map phone numbers to find corresponding Users (Students) and Payments
        const enrolledLeads = leads.filter(l => l.enrollmentStatus === 'ENROLLED');
        const cleanPhoneMap = {}; // Maps clean phone back to lead's full phone string
        const cleanPhones = [];
        
        enrolledLeads.forEach(l => {
            let clean = l.phone.split('_')[0];
            if (clean.startsWith('94')) clean = '0' + clean.substring(2);
            cleanPhones.push(clean);
            cleanPhoneMap[l.phone] = clean;
        });

        const students = await prisma.user.findMany({
            where: { phone: { in: cleanPhones } },
            select: { id: true, phone: true }
        });

        const studentIdByCleanPhone = {};
        students.forEach(s => studentIdByCleanPhone[s.phone] = s.id);

        const studentPhoneMap = {}; // original lead phone -> student id
        enrolledLeads.forEach(l => {
            const cPhone = cleanPhoneMap[l.phone];
            if (studentIdByCleanPhone[cPhone]) {
                studentPhoneMap[l.phone] = studentIdByCleanPhone[cPhone];
            }
        });`;

content = content.replace(oldPhoneLogic, newPhoneLogic);

// 2. Fix ChatMessage directions
const oldMsgLogic = `                    if (msg.direction === 'IN') {
                        c.messages[inqType].received++;
                        if (!msg.isRead) c.messages[inqType].unread++;
                    } else if (msg.direction === 'OUT') {
                        c.messages[inqType].sent++;
                    }`;

const newMsgLogic = `                    // Handle both casing for safety
                    const dir = msg.direction ? msg.direction.toLowerCase() : '';
                    if (dir === 'in' || dir === 'inbound') {
                        c.messages[inqType].received++;
                        if (!msg.isRead) c.messages[inqType].unread++;
                    } else if (dir === 'out' || dir === 'outbound') {
                        c.messages[inqType].sent++;
                    }`;

content = content.replace(oldMsgLogic, newMsgLogic);

fs.writeFileSync(path, content);
console.log('Successfully patched bugs in V3 Analytics.');
