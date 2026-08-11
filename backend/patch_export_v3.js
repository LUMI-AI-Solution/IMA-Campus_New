const fs = require('fs');
const path = './controllers/dataExportController.js';

let content = fs.readFileSync(path, 'utf8');

const startMarker = `// ============================================================================
// MODULE 03: COORDINATOR KPI ANALYTICS
// ============================================================================
exports.getCoordinatorKPI = async (req, res) => {`;

const startIndex = content.indexOf(startMarker);
if (startIndex === -1) {
    console.error("Start marker not found in dataExportController.js");
    process.exit(1);
}

const newFunction = `// ============================================================================
// MODULE 03: COORDINATOR KPI ANALYTICS
// ============================================================================
exports.getCoordinatorKPI = async (req, res) => {
    try {
        const { businessId, batchId } = req.query;
        if (!businessId) {
            return res.status(400).json({ error: "Business ID is required" });
        }
        
        const parsedBizId = parseInt(businessId);
        
        // Access Check
        const hasAccess = await checkAccess(req, parsedBizId);
        if (!hasAccess) {
            return res.status(403).json({ error: "Access Denied to this Campaign" });
        }

        let leadWhere = { 
            campaignType: 'AFTER_SEMINAR',
            assignedTo: { not: null }
        };

        if (batchId && batchId !== 'null') {
            leadWhere.batchId = parseInt(batchId);
        } else {
            leadWhere.OR = [
                { phone: { endsWith: \`BIZ_\${parsedBizId}\` } },
                { phone: { endsWith: \`BIZ_\${parsedBizId}_AS\` } },
                { phone: { contains: \`BIZ_\${parsedBizId}_BATCH_\` } },
                { phone: { contains: \`BIZ_\${parsedBizId}_ROUND_\` } },
                { phone: { contains: \`BIZ_\${parsedBizId}_HISTORY_ROUND_\` } }
            ];
        }

        const leads = await prisma.lead.findMany({
            where: leadWhere,
            include: {
                assignedUser: {
                    select: { id: true, firstName: true, lastName: true }
                },
                messages: true,
                roundProgress: true
            }
        });

        // Map phone numbers to find corresponding Users (Students) and Payments
        const enrolledPhones = leads.filter(l => l.enrollmentStatus === 'ENROLLED').map(l => l.phone);
        const students = await prisma.user.findMany({
            where: { phone: { in: enrolledPhones } },
            select: { id: true, phone: true }
        });

        const studentPhoneMap = {};
        students.forEach(s => studentPhoneMap[s.phone] = s.id);

        const studentIds = students.map(s => s.id);
        const payments = await prisma.payment.findMany({
            where: { studentId: { in: studentIds }, status: { in: [0, 1, 4] } },
            orderBy: { created_at: 'desc' }
        });

        const paymentMap = {}; // studentId -> all payments
        payments.forEach(p => {
            if (!paymentMap[p.studentId]) paymentMap[p.studentId] = [];
            paymentMap[p.studentId].push(p);
        });

        // Initialize Aggregation Map
        const coordinatorMap = {};
        const getMonthYear = (dateStr) => {
            if (!dateStr) return 'Unknown';
            const d = new Date(dateStr);
            return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        };

        leads.forEach(lead => {
            if (!lead.assignedUser) return;
            const staffId = lead.assignedUser.id;
            
            if (!coordinatorMap[staffId]) {
                coordinatorMap[staffId] = {
                    id: staffId,
                    name: \`\${lead.assignedUser.firstName} \${lead.assignedUser.lastName || ''}\`.trim(),
                    calls: {
                        openSem: { assigned: 0, covered: 0, pending: 0, r1: { covered: 0, pending: 0 }, r2: { covered: 0, pending: 0 }, enrolled: 0, nonEnrolled: 0, paid: 0 },
                        newInq: { assigned: 0, covered: 0, pending: 0, r1: { covered: 0, pending: 0 }, r2: { covered: 0, pending: 0 }, enrolled: 0, nonEnrolled: 0, paid: 0 },
                    },
                    finances: {
                        totalEnrolled: 0,
                        monthly: 0, installment: 0, full: 0, upgraded: 0,
                        subjects: {}
                    },
                    messages: {
                        openSem: { total: 0, sent: 0, received: 0, unread: 0 },
                        newInq: { total: 0, sent: 0, received: 0, unread: 0 }
                    },
                    monthlyTrends: {} // e.g. { '2024-05': { enrolled: 5, drops: 1, growth: 2, monthly: 1, full: 2, install: 2, upgraded: 0 } }
                };
            }
            
            const c = coordinatorMap[staffId];
            const inqType = lead.inquiryType === 'NEW_INQ' ? 'newInq' : 'openSem';
            
            // Calls Aggregation
            c.calls[inqType].assigned++;
            if (lead.callStatus === 'pending') c.calls[inqType].pending++;
            else c.calls[inqType].covered++;

            // Round Breakdown
            const r1 = lead.roundProgress?.find(r => r.roundNum === 1);
            if (r1) {
                if (r1.callStatus === 'pending') c.calls[inqType].r1.pending++;
                else c.calls[inqType].r1.covered++;
            } else {
                // Fallback to lead coordinationRound
                if (lead.coordinationRound === 1) {
                    if (lead.callStatus === 'pending') c.calls[inqType].r1.pending++;
                    else c.calls[inqType].r1.covered++;
                }
            }

            const r2 = lead.roundProgress?.find(r => r.roundNum === 2);
            if (r2) {
                if (r2.callStatus === 'pending') c.calls[inqType].r2.pending++;
                else c.calls[inqType].r2.covered++;
            } else {
                if (lead.coordinationRound === 2) {
                    if (lead.callStatus === 'pending') c.calls[inqType].r2.pending++;
                    else c.calls[inqType].r2.covered++;
                }
            }

            // Enrollments
            if (lead.enrollmentStatus === 'ENROLLED') {
                c.calls[inqType].enrolled++;
                c.calls[inqType].paid++;
                c.finances.totalEnrolled++;
                
                if (lead.paymentIntention === 'MONTHLY') c.finances.monthly++;
                else if (lead.paymentIntention === 'INSTALLMENT') c.finances.installment++;
                else if (lead.paymentIntention === 'FULL') c.finances.full++;

                let isUpgraded = false;
                let isDropped = false;
                
                // Check Payments for this student
                const sId = studentPhoneMap[lead.phone];
                if (sId && paymentMap[sId] && paymentMap[sId].length > 0) {
                    const stuPayments = paymentMap[sId];
                    // Upgraded: Multiple payments with different types or Full after Monthly
                    if (stuPayments.length > 1) {
                        const hasMonthly = stuPayments.some(p => p.payment_type === 1);
                        const hasFull = stuPayments.some(p => p.payment_type === 3);
                        if (hasMonthly && hasFull) {
                            isUpgraded = true;
                            c.finances.upgraded++;
                        }
                    }

                    // Subjects Parsing
                    const firstPayment = stuPayments[stuPayments.length - 1]; // Oldest payment
                    if (firstPayment && firstPayment.subjects) {
                        try {
                            const subs = JSON.parse(firstPayment.subjects);
                            subs.forEach(s => {
                                let subName = typeof s === 'string' ? s : (s.name || s.id || 'Unknown');
                                if (!c.finances.subjects[subName]) c.finances.subjects[subName] = 0;
                                c.finances.subjects[subName]++;
                            });
                        } catch(e) {}
                    }

                    // Drop Logic: Monthly/Installment and no payment in last 35 days
                    if (lead.paymentIntention !== 'FULL') {
                        const latestPayment = stuPayments[0]; // Newest payment
                        const daysSinceLastPayment = (new Date() - new Date(latestPayment.created_at)) / (1000 * 60 * 60 * 24);
                        if (daysSinceLastPayment > 35) {
                            isDropped = true;
                        }
                    }
                }

                // Monthly Trend Logic
                const monthStr = getMonthYear(lead.createdAt || new Date());
                if (!c.monthlyTrends[monthStr]) {
                    c.monthlyTrends[monthStr] = { month: monthStr, enrolled: 0, drops: 0, growth: 0, monthly: 0, full: 0, install: 0, upgraded: 0 };
                }
                c.monthlyTrends[monthStr].enrolled++;
                if (lead.paymentIntention === 'MONTHLY') c.monthlyTrends[monthStr].monthly++;
                else if (lead.paymentIntention === 'INSTALLMENT') c.monthlyTrends[monthStr].install++;
                else if (lead.paymentIntention === 'FULL') c.monthlyTrends[monthStr].full++;
                
                if (isUpgraded) c.monthlyTrends[monthStr].upgraded++;
                
                if (isDropped) {
                    c.monthlyTrends[monthStr].drops++;
                } else {
                    c.monthlyTrends[monthStr].growth++; // Active
                }

            } else {
                c.calls[inqType].nonEnrolled++;
            }

            // Messaging Aggregation
            if (lead.messages && lead.messages.length > 0) {
                c.messages[inqType].total += lead.messages.length;
                lead.messages.forEach(msg => {
                    if (msg.direction === 'IN') {
                        c.messages[inqType].received++;
                        if (!msg.isRead) c.messages[inqType].unread++;
                    } else if (msg.direction === 'OUT') {
                        c.messages[inqType].sent++;
                    }
                });
            }
        });

        // Format Output
        const result = Object.values(coordinatorMap).map(c => {
            const formattedTrends = Object.values(c.monthlyTrends).sort((a,b) => a.month.localeCompare(b.month));
            
            // Format subjects into array for charting
            const subjectArray = Object.entries(c.finances.subjects).map(([name, count]) => ({
                name, count, percent: c.finances.totalEnrolled > 0 ? ((count / c.finances.totalEnrolled) * 100).toFixed(1) : 0
            }));

            // Format Calls Response Rates
            const os = c.calls.openSem;
            const ni = c.calls.newInq;
            os.responseRate = os.assigned > 0 ? ((os.covered / os.assigned) * 100).toFixed(1) : '0.0';
            ni.responseRate = ni.assigned > 0 ? ((ni.covered / ni.assigned) * 100).toFixed(1) : '0.0';

            return {
                ...c,
                monthlyTrendsArray: formattedTrends,
                subjectsArray: subjectArray
            };
        });

        res.status(200).json(safeJson(result));

    } catch (error) {
        console.error("Coordinator KPI Error:", error);
        res.status(500).json({ error: "Failed to load Coordinator KPI Analytics" });
    }
};
`;

const finalContent = content.substring(0, startIndex) + newFunction;
fs.writeFileSync(path, finalContent);
console.log('Successfully patched getCoordinatorKPI for V3 Analytics.');
