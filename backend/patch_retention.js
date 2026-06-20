const fs = require('fs');
const path = './controllers/afterSeminarRetentionController.js';

let code = fs.readFileSync(path, 'utf-8');

const newFunc = `exports.getRetentionCampaignData = async (req, res) => {
    try {
        const { businessId, batchId, startDate, endDate, targetMonthName } = req.query;

        // 1. Fetch Monthly Groups & Payments
        let batchIdsToFetch = [];
        if (batchId && batchId !== '' && batchId !== 'ALL' && batchId !== 'UNASSIGNED') {
            batchIdsToFetch = [parseInt(batchId)];
        } else if (businessId && businessId !== '' && businessId !== 'ALL') {
            const bizBatches = await prisma.batch.findMany({ where: { businessId: parseInt(businessId) }, select: { id: true } });
            batchIdsToFetch = bizBatches.map(b => b.id);
        }

        const allGroups = await prisma.group.findMany({
            where: { batchId: { in: batchIdsToFetch } },
            orderBy: { itemOrder: 'asc' }
        });
        const monthlyGroupsRaw = allGroups.filter(g => !g.name.toLowerCase().includes('full'));

        const uniqueGroupNames = [...new Set(monthlyGroupsRaw.map(g => g.name))];
        const distinctMonthlyGroups = uniqueGroupNames.map(name => {
            const matchingGroups = monthlyGroupsRaw.filter(g => g.name === name);
            return {
                name: name,
                ids: matchingGroups.map(g => g.id)
            };
        });

        // Determine default active group name if not provided
        let activeGroupName = targetMonthName;
        if (!activeGroupName && distinctMonthlyGroups.length > 0) {
            const today = new Date();
            const currentMonthLong = today.toLocaleString('default', { month: 'long' }).toLowerCase();
            const currentMonthShort = today.toLocaleString('default', { month: 'short' }).toLowerCase();

            let activeGroup = distinctMonthlyGroups.find(g => 
                g.name.toLowerCase().includes(currentMonthLong) || 
                g.name.toLowerCase().includes(currentMonthShort)
            );
            if (!activeGroup) {
                activeGroup = distinctMonthlyGroups[distinctMonthlyGroups.length - 1];
            }
            activeGroupName = activeGroup ? activeGroup.name : null;
        }

        // Fetch approved payments
        const payments = await prisma.payment.findMany({
            where: { batchId: { in: batchIdsToFetch }, status: 1 },
            select: {
                id: true, payment_type: true, groupId: true, businessId: true, batchId: true,
                student: { select: { id: true, firstName: true, lastName: true, phone: true, whatsapp: true } }
            }
        });

        // 2. OVERALL ENROLLED CALCULATION (In CRM vs Not In CRM)
        const crmWhereClauseOverall = buildStatsWhereClause(businessId, batchId, null, null, {
            campaignType: 'AFTER_SEMINAR',
            source: { not: 'system' }
        });
        const allCrmLeads = await prisma.lead.findMany({
            where: crmWhereClauseOverall,
            select: { phone: true }
        });
        const crmLeadPhones = new Set(allCrmLeads.map(l => getLast9Digits(l.phone)));

        const paymentStudentsMap = new Map();
        payments.forEach(p => { if (p.student) paymentStudentsMap.set(p.student.id, p.student); });

        let inCrmCount = 0;
        let notInCrmCount = 0;
        let notInCrmStudents = [];

        paymentStudentsMap.forEach(student => {
            const studentLast9 = getLast9Digits(student.phone || student.whatsapp);
            if (studentLast9 && crmLeadPhones.has(studentLast9)) {
                inCrmCount++;
            } else {
                notInCrmCount++;
                notInCrmStudents.push({
                    id: student.id,
                    name: student.firstName ? \`\${student.firstName} \${student.lastName || ''}\`.trim() : 'Unknown',
                    phone: student.phone,
                    whatsapp: student.whatsapp
                });
            }
        });

        // 3. Strict Business ID Filter for CRM Leads for the frontend
        let whereClause = buildStatsWhereClause(businessId, batchId, startDate, endDate, { 
            campaignType: 'AFTER_SEMINAR',
            inquiryType: 'PAID_CAMP',
            source: { not: 'system' } // Crucial! Exclude system generated leads
        });

        const activeStaffIds = await getActiveStaffIds(businessId, batchId);
        const leads = await prisma.lead.findMany({
            where: whereClause,
            include: { assignedUser: { select: { firstName: true, lastName: true, businessType: true } } }
        });

        const activeLeads = leads.map(l => {
            if (l.assignedTo && !activeStaffIds.has(l.assignedTo)) {
                return { ...l, assignedTo: null, assignedUser: null };
            }
            return l;
        });

        // 4. Map enrolledGroupIds to each lead
        const leadsWithGroupData = activeLeads.map(l => {
            const cleanPhone = l.phone.split('_')[0];
            const leadLast9 = getLast9Digits(cleanPhone);
            const studentPayments = payments.filter(p => {
                if (!p.student || (!p.student.phone && !p.student.whatsapp)) return false;
                const studentLast9 = getLast9Digits(p.student.phone || p.student.whatsapp);
                return leadLast9 !== '' && leadLast9 === studentLast9;
            });

            let enrolledGroupIds = [];
            const hasFullPayment = studentPayments.some(p => p.payment_type === 3) || l.paymentIntention === 'FULL';

            if (hasFullPayment) {
                enrolledGroupIds = monthlyGroupsRaw.map(g => g.id);
            } else {
                studentPayments.forEach(p => { if (p.groupId) enrolledGroupIds.push(p.groupId); });
            }

            return { ...l, enrolledGroupIds: [...new Set(enrolledGroupIds)] };
        });

        // 5. Calculate Retention Stats for the specific month selected
        let prevMonthEnrolled = 0;
        let thisMonthRenewed = 0;
        
        leadsWithGroupData.forEach(l => {
            if (l.paymentIntention !== 'NOT_DECIDED') {
                prevMonthEnrolled++;
                if (l.enrollmentStatus === 'ENROLLED') {
                    thisMonthRenewed++;
                }
            }
        });

        const thisMonthDropped = prevMonthEnrolled - thisMonthRenewed;

        res.status(200).json({
            leads: leadsWithGroupData,
            monthlyGroups: distinctMonthlyGroups,
            defaultActiveGroupName: activeGroupName,
            overallEnrolledStats: {
                inCrmCount,
                notInCrmCount,
                notInCrmStudents
            },
            stats: {
                prevMonthEnrolled,
                thisMonthRenewed,
                thisMonthDropped: thisMonthDropped > 0 ? thisMonthDropped : 0
            }
        });

    } catch (error) {
        console.error("Retention Data Error:", error);
        res.status(500).json({ error: "Failed to fetch retention campaign data" });
    }
};`;

// replace from `exports.getRetentionCampaignData = async (req, res) => {` to the end of the file.
const regex = /exports\.getRetentionCampaignData = async \(req, res\) => \{[\s\S]*\}\;/;
if (regex.test(code)) {
    code = code.replace(regex, newFunc);
    fs.writeFileSync(path, code, 'utf-8');
    console.log("SUCCESS");
} else {
    console.log("FAILED to find match");
}
