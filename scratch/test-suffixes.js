const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        const businessId = "6"; // Commerce Business
        console.log("Checking Business ID 6 (Commerce) with different suffix lengths...");

        // Fetch leads
        const leads = await prisma.lead.findMany({
            where: {
                campaignType: 'AFTER_SEMINAR',
                OR: [
                    { phone: { endsWith: `_BIZ_${businessId}` } },         
                    { phone: { endsWith: `_BIZ_${businessId}_AS` } },      
                    { phone: { contains: `_BIZ_${businessId}_BATCH_` } },
                    { phone: { contains: `_BIZ_${businessId}_ROUND_` } },
                    { phone: { contains: `_BIZ_${businessId}_HISTORY_ROUND_` } }
                ]
            }
        });
        console.log(`Total Leads: ${leads.length}`);

        // Fetch verified payments
        const verifiedPayments = await prisma.payment.findMany({
            where: { status: { in: [1, 4] }, businessId: 6 },
            include: { student: true }
        });
        console.log(`Total Verified Payments: ${verifiedPayments.length}`);

        for (let digits of [7, 9]) {
            console.log(`\n--- RUNNING DIAGNOSTICS WITH Suffix Length: ${digits} ---`);

            const cleanPhoneToLeadMap = {};
            leads.forEach(l => {
                if (!l.phone) return;
                const mainPhonePart = l.phone.split('_')[0];
                const cleanLeadPhone = mainPhonePart.replace(/[^0-9]/g, '');
                if (cleanLeadPhone.length >= digits) {
                    cleanPhoneToLeadMap[cleanLeadPhone.slice(-digits)] = l;
                }
            });

            const verifiedStudentPhones = [];
            verifiedPayments.forEach(p => {
                if (p.student) {
                    if (p.student.phone) verifiedStudentPhones.push(p.student.phone);
                    if (p.student.whatsapp) verifiedStudentPhones.push(p.student.whatsapp);
                    if (p.student.optionalPhone) verifiedStudentPhones.push(p.student.optionalPhone);
                }
            });

            const relatedStudents = await prisma.user.findMany({
                where: {
                    role: { in: ['Student', 'USER', 'user', 'student', 'STUDENT'] },
                    OR: [
                        { phone: { in: verifiedStudentPhones.filter(Boolean) } },
                        { whatsapp: { in: verifiedStudentPhones.filter(Boolean) } },
                        { optionalPhone: { in: verifiedStudentPhones.filter(Boolean) } }
                    ]
                }
            });

            const studentIdToRelatedPhonesMap = {};
            verifiedPayments.forEach(p => {
                if (!p.student) return;
                const stu = p.student;
                const sid = stu.id;

                const matches = relatedStudents.filter(other => {
                    if (other.id === sid) return true;
                    const stuNumSet = new Set([stu.phone, stu.whatsapp, stu.optionalPhone].filter(Boolean));
                    const otherNumSet = new Set([other.phone, other.whatsapp, other.optionalPhone].filter(Boolean));
                    for (let num of stuNumSet) {
                        if (otherNumSet.has(num)) return true;
                    }
                    return false;
                });

                const phoneSuffixes = new Set();
                matches.forEach(m => {
                    [m.phone, m.whatsapp, m.optionalPhone].forEach(ph => {
                        if (!ph) return;
                        const cleanPh = ph.replace(/[^0-9]/g, '');
                        if (cleanPh.length >= digits) {
                            phoneSuffixes.add(cleanPh.slice(-digits));
                        }
                    });
                });

                studentIdToRelatedPhonesMap[stu.id] = phoneSuffixes;
            });

            const verifiedStudentsNotInCrm = [];
            const seenStudentPhones = new Set();
            const verifiedPhones = new Set();

            verifiedPayments.forEach(p => {
                if (!p.student) return;
                const stuPhone = (p.student.phone || p.student.whatsapp || '').replace(/[^0-9]/g, '');
                if (stuPhone.length < digits) return;
                const key = stuPhone.slice(-digits);

                const relatedSuffixes = studentIdToRelatedPhonesMap[p.student.id] || new Set();
                relatedSuffixes.forEach(suffix => verifiedPhones.add(suffix));

                if (seenStudentPhones.has(key)) return;
                seenStudentPhones.add(key);

                let hasCrmLead = false;
                for (let suffix of relatedSuffixes) {
                    if (cleanPhoneToLeadMap[suffix]) {
                        hasCrmLead = true;
                        break;
                    }
                }

                if (!hasCrmLead) {
                    verifiedStudentsNotInCrm.push(p);
                }
            });

            let enrolledInLeads = 0;
            leads.forEach(l => {
                if (!l.phone) return;
                const cleanLeadPhone = l.phone.split('_')[0].replace(/[^0-9]/g, '');
                const key = cleanLeadPhone.slice(-digits);

                const isReallyEnrolled = cleanLeadPhone.length >= digits && verifiedPhones.has(key);
                if (isReallyEnrolled) enrolledInLeads++;
            });

            console.log(`- Direct Signups: ${verifiedStudentsNotInCrm.length}`);
            console.log(`- CRM Enrolled Leads: ${enrolledInLeads}`);
            console.log(`- SUM: ${verifiedStudentsNotInCrm.length + enrolledInLeads}`);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
