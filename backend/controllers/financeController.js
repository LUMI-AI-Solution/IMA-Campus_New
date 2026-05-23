const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const safeJson = (data) => JSON.parse(JSON.stringify(data, (key, value) => typeof value === 'bigint' ? value.toString() : value));

// ============================================================================
// 💰 FINANCE MODULE: REVENUE ALLOCATION MATRIX (STUDENT-WISE)
// ============================================================================
exports.getFinanceMatrix = async (req, res) => {
    try {
        const { businessId, batchId } = req.query;
        if (!batchId || batchId === 'null') return res.status(400).json({ error: "Batch ID is required" });
        const parsedBatchId = parseInt(batchId);

        // 1. Group tika gannawa (Masa tika)
        const rawGroups = await prisma.group.findMany({
            where: { batchId: parsedBatchId },
            orderBy: { itemOrder: 'asc' },
            select: { id: true, name: true, itemOrder: true }
        });
        const monthlyGroups = rawGroups.filter(g => !g.name.toLowerCase().includes('full payment') && !g.name.toLowerCase().includes('full'));

        // 2. Courses (Subjects)
        const courses = await prisma.course.findMany({
            where: { group: { batchId: parsedBatchId } },
            select: { id: true, name: true }
        });
        const courseMap = {};
        courses.forEach(c => courseMap[c.id] = c.name.trim().toUpperCase());
        const uniqueSubjectNames = [...new Set(Object.values(courseMap))];

        // 3. Approved Payments (Student details එක්කම ගන්නවා)
        const payments = await prisma.payment.findMany({
            where: { batchId: parsedBatchId, status: 1 },
            include: { student: true }, 
            orderBy: { created_at: 'asc' }
        });

        const installmentPlans = await prisma.installment.findMany({
            where: { batchId: parsedBatchId },
            orderBy: { subjectCount: 'desc' }
        });

        let grandTotal = 0.0;
        const monthlyTotals = {};
        monthlyGroups.forEach(mg => { monthlyTotals[mg.id] = 0.0; });

        // 4. Student-wise Mapping Logic
        const studentMap = {};

        payments.forEach(p => {
            if (!p.studentId || !p.student) return;
            const paidAmount = parseFloat(p.amount || 0);
            if (paidAmount <= 0) return; // සල්ලි ගෙවලා නැත්නම් ස්කිප්

            // ළමයා තාම Map එකේ නැත්නම් අලුතෙන් හදනවා
            if (!studentMap[p.studentId]) {
                let typeStr = 'Monthly';
                if (parseInt(p.payment_type) === 3) typeStr = 'Full';
                else if (parseInt(p.payment_type) === 2) typeStr = 'Installment';

                studentMap[p.studentId] = {
                    id: p.studentId,
                    studentNo: p.student.studentNo || `STU-${p.studentId}`,
                    studentName: `${p.student.firstName} ${p.student.lastName}`.trim(),
                    phone: p.student.phone,
                    whatsapp: p.student.whatsapp,
                    type: typeStr,
                    matrixValues: {}, 
                    totalPaid: 0.0
                };
                
                // 0.0 දාලා Matrix එක Initialize කරනවා
                monthlyGroups.forEach(mg => {
                    studentMap[p.studentId].matrixValues[mg.id] = {};
                    uniqueSubjectNames.forEach(sub => {
                        studentMap[p.studentId].matrixValues[mg.id][sub] = 0.0;
                    });
                });
            }

            const sData = studentMap[p.studentId];
            const payType = parseInt(p.payment_type);

            // 🔥 FIX: බෙදන්න කලින් මුලින්ම සල්ලි ටික එකතු කරගන්නවා!
            // මේකෙන් Grand Total එකයි Net Flow එකයි කවදාවත් මිස් වෙන්නේ නෑ.
            sData.totalPaid += paidAmount;
            grandTotal += paidAmount;

            let enrolledSubjects = [];
            if (p.subjects) {
                try {
                    const subs = JSON.parse(p.subjects);
                    subs.forEach(item => {
                        if (typeof item === 'object' && item.id && courseMap[parseInt(item.id)]) enrolledSubjects.push(courseMap[parseInt(item.id)]);
                        else if (typeof item === 'string' && isNaN(parseInt(item))) enrolledSubjects.push(item.trim().toUpperCase());
                        else if (!isNaN(parseInt(item)) && courseMap[parseInt(item)]) enrolledSubjects.push(courseMap[parseInt(item)]);
                    });
                } catch(e) {}
            }

            // අදාල බැච් එකේ තියෙන Subjects විතරක් ෆිල්ටර් කරනවා
            enrolledSubjects = [...new Set(enrolledSubjects)].filter(sub => uniqueSubjectNames.includes(sub));
            const numSubjects = enrolledSubjects.length;

            // Subject එකක් නැත්නම් Grid එකට බෙදන්න බෑ, ඒත් Total එකට එකතු වෙලා ඉවරයි.
            if (numSubjects === 0) return; 

            // ================= LOGIC TO DISTRIBUTE INTO GRID =================
            if (payType === 3) {
                if (monthlyGroups.length > 0) {
                    const amountPerMonth = paidAmount / monthlyGroups.length;
                    const amountPerMonthPerSub = amountPerMonth / numSubjects;
                    enrolledSubjects.forEach(sub => {
                        monthlyGroups.forEach(mg => {
                            sData.matrixValues[mg.id][sub] += amountPerMonthPerSub;
                            monthlyTotals[mg.id] += amountPerMonthPerSub;
                        });
                    });
                }
            } else if (payType === 1) {
                let targetGroupId = p.groupId;
                let mgExists = monthlyGroups.find(mg => mg.id === targetGroupId);
                
                // 🔥 Fallback: අදාල මාසේ හොයාගන්න බැරි නම් (Full Payment group එකක් වගේ නම්)
                // පළවෙනි මාසෙට හරි සල්ලි ටික දානවා පේන්න ඕන නිසා.
                if (!mgExists && monthlyGroups.length > 0) {
                    mgExists = monthlyGroups[0];
                    targetGroupId = mgExists.id;
                }

                if (mgExists) {
                    const amountPerSub = paidAmount / numSubjects;
                    enrolledSubjects.forEach(sub => {
                        sData.matrixValues[targetGroupId][sub] += amountPerSub;
                        monthlyTotals[targetGroupId] += amountPerSub;
                    });
                }
            } else if (payType === 2) {
                const plan = installmentPlans.find(pl => pl.subjectCount <= numSubjects);
                let totalPhases = 1;
                if (plan && plan.details) {
                    try { totalPhases = JSON.parse(plan.details).length; } catch(e) {}
                }
                const currentInstNo = p.installment_no || 1;
                const monthSpan = Math.ceil(monthlyGroups.length / totalPhases); 
                const startIndex = (currentInstNo - 1) * monthSpan;
                const endIndex = Math.min(startIndex + monthSpan, monthlyGroups.length);
                const actualMonthsCovered = endIndex - startIndex;

                if (actualMonthsCovered > 0 && monthlyGroups.length > 0) {
                    const amountPerMonth = paidAmount / actualMonthsCovered;
                    const amountPerMonthPerSub = amountPerMonth / numSubjects;
                    enrolledSubjects.forEach(sub => {
                        for (let i = startIndex; i < endIndex; i++) {
                            const mgId = monthlyGroups[i].id;
                            sData.matrixValues[mgId][sub] += amountPerMonthPerSub;
                            monthlyTotals[mgId] += amountPerMonthPerSub;
                        }
                    });
                } else if (monthlyGroups.length > 0) {
                    // Fallback for Installments with bad math
                    const amountPerSub = paidAmount / numSubjects;
                    const fallbackMgId = monthlyGroups[0].id;
                    enrolledSubjects.forEach(sub => {
                        sData.matrixValues[fallbackMgId][sub] += amountPerSub;
                        monthlyTotals[fallbackMgId] += amountPerSub;
                    });
                }
            }
        });

        const studentsArray = Object.values(studentMap);

        res.status(200).json(safeJson({
            months: monthlyGroups,
            subjects: uniqueSubjectNames,
            students: studentsArray,
            monthlyTotals: monthlyTotals,
            grandTotal: grandTotal // දැන් මේක 100% ක් Dashboard Report එකට සමාන වෙනවා
        }));

    } catch (error) {
        console.error("Finance Matrix Calculation Error:", error);
        res.status(500).json({ error: "Failed to generate Finance Matrix" });
    }
};