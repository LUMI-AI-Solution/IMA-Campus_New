const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runDiagnostics() {
    try {
        console.log("=== STARTING CRM DIRECTORY DIAGNOSTICS BY BUSINESS ===");
        
        // Fetch all businesses
        const businesses = await prisma.business.findMany({ select: { id: true, name: true } });
        console.log(`Found ${businesses.length} businesses in Database.`);
        
        for (let biz of businesses) {
            console.log(`\n--- BUSINESS: ${biz.name} (ID: ${biz.id}) ---`);
            
            // Build business filter conditions
            const businessId = String(biz.id);
            let whereClause = { 
                campaignType: 'AFTER_SEMINAR',
                OR: [
                    { phone: { endsWith: `_BIZ_${businessId}` } },         
                    { phone: { endsWith: `_BIZ_${businessId}_AS` } },      
                    { phone: { contains: `_BIZ_${businessId}_BATCH_` } },
                    { phone: { contains: `_BIZ_${businessId}_ROUND_` } },
                    { phone: { contains: `_BIZ_${businessId}_HISTORY_ROUND_` } }
                ]
            };
            
            const leads = await prisma.lead.findMany({
                where: whereClause,
                select: { id: true, name: true, phone: true, enrollmentStatus: true }
            });
            console.log(`Leads in CRM for this Business: ${leads.length}`);

            // Fetch verified payments for this business
            const paymentWhere = { 
                status: { in: [1, 4] },
                businessId: biz.id
            }; 
            const verifiedPayments = await prisma.payment.findMany({
                where: paymentWhere,
                include: { student: true }
            });
            console.log(`Verified payments in DB for this Business: ${verifiedPayments.length}`);

            // Index leads
            const cleanPhoneToLeadMap = {};
            leads.forEach(l => {
                if (!l.phone) return;
                const mainPhonePart = l.phone.split('_')[0];
                const cleanLeadPhone = mainPhonePart.replace(/[^0-9]/g, '');
                if (cleanLeadPhone.length >= 9) {
                    cleanPhoneToLeadMap[cleanLeadPhone.slice(-9)] = l;
                }
            });

            // Index verified student phones
            const verifiedStudentNics = [];
            const verifiedStudentPhones = [];
            verifiedPayments.forEach(p => {
                if (p.student) {
                    if (p.student.nic) verifiedStudentNics.push(p.student.nic.trim());
                    if (p.student.phone) verifiedStudentPhones.push(p.student.phone);
                    if (p.student.whatsapp) verifiedStudentPhones.push(p.student.whatsapp);
                    if (p.student.optionalPhone) verifiedStudentPhones.push(p.student.optionalPhone);
                }
            });

            const relatedStudents = await prisma.user.findMany({
                where: {
                    role: { in: ['Student', 'USER', 'user', 'student', 'STUDENT'] },
                    OR: [
                        { nic: { in: verifiedStudentNics.filter(Boolean) } },
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
                    if (stu.nic && other.nic && stu.nic.trim() === other.nic.trim()) return true;
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
                        if (cleanPh.length >= 9) {
                            phoneSuffixes.add(cleanPh.slice(-9));
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
                if (stuPhone.length < 9) return;
                const key = stuPhone.slice(-9);

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

            console.log(`- Verified payments not in CRM (Direct Signups): ${verifiedStudentsNotInCrm.length}`);
            
            let enrolledInLeads = 0;
            leads.forEach(l => {
                if (!l.phone) return;
                const cleanLeadPhone = l.phone.split('_')[0].replace(/[^0-9]/g, '');
                const key = cleanLeadPhone.slice(-9);

                const isReallyEnrolled = cleanLeadPhone.length >= 9 && verifiedPhones.has(key);
                if (isReallyEnrolled) enrolledInLeads++;
            });
            
            console.log(`- CRM leads matched with verified payments (Enrolled leads): ${enrolledInLeads}`);
            console.log(`- SUM of (Direct Signups + Enrolled leads): ${verifiedStudentsNotInCrm.length + enrolledInLeads}`);
        }
        
    } catch (e) {
        console.error("Diagnostic error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

runDiagnostics();
