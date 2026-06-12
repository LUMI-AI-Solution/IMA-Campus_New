// Helper function to handle BigInt serialization
const safeJson = (data) => {
    return JSON.parse(JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));
};

exports.getFinanceMatrix = async (req, res) => {
    try {
        const { businessId, batchId } = req.query;
        if (!batchId || batchId === 'null') return res.status(400).json({ error: "Batch ID is required" });
        const parsedBatchId = parseInt(batchId);

        const userId = req.user.userId || req.user.id;
        const userRole = req.user.role;
        const businessType = req.user.businessType;
        const userDepartment = req.user.department;
        
        const roleUpper = userRole ? userRole.toUpperCase().replace(/ /g, '_') : '';
        const isAdmin = ['SYSTEM_ADMIN', 'DIRECTOR'].includes(roleUpper) || userDepartment === 'Finance';
        
        if (!isAdmin) {
            const allBiz = await prisma.business.findMany();
            const myBizs = allBiz.filter(biz => {
                const isManagerOf = biz.head_manager_id === userId || biz.ass_manager_id === userId;
                const matchesBizType = businessType && (
                    String(biz.id) === String(businessType).trim() ||
                    biz.name.toLowerCase().trim() === String(businessType).toLowerCase().trim() ||
                    biz.name.toLowerCase().includes(String(businessType).toLowerCase().trim()) ||
                    String(businessType).toLowerCase().trim().includes(biz.name.toLowerCase().trim())
                );
                return isManagerOf || matchesBizType;
            });
            const myBizIds = myBizs.map(b => b.id);
            
            const batchObj = await prisma.batch.findUnique({ where: { id: parsedBatchId } });
            if (!batchObj || !myBizIds.includes(batchObj.businessId)) {
                return res.status(403).json({ error: "Access Denied. You are not allowed to view this batch's finance matrix." });
            }
        }

        // 1. Get Monthly Groups (Columns Headers)
        const rawGroups = await prisma.group.findMany({
            where: { batchId: parsedBatchId },
            orderBy: { itemOrder: 'asc' },
            select: { id: true, name: true }
        });
        const monthlyGroups = rawGroups.filter(g => !g.name.toLowerCase().includes('full payment') && !g.name.toLowerCase().includes('full'));

        // 2. Get Courses
        const courses = await prisma.course.findMany({
            where: { group: { batchId: parsedBatchId } },
            select: { id: true, name: true, price: true, code: true, activeMonths: true, startMonth: true, endMonth: true }
        });

        const courseMap = {};
        const courseCodeMap = {};
        courses.forEach(c => {
            const normalizedSubName = c.name.trim().toUpperCase();
            courseMap[c.id] = normalizedSubName;
            if (c.code) courseCodeMap[normalizedSubName] = c.code.trim();
        });
        const uniqueSubjectNames = [...new Set(Object.values(courseMap))];

        // Helper function to extract exact monthly groups a course spans
        const getActiveMonthsForCourse = (course) => {
            if (!course) return monthlyGroups;
            const startStr = (course.startMonth || '').trim().toLowerCase();
            const endStr = (course.endMonth || '').trim().toLowerCase();
            if (!startStr || !endStr) return monthlyGroups;

            let startIndex = monthlyGroups.findIndex(g => g.name.toLowerCase().includes(startStr));
            let endIndex = monthlyGroups.findIndex(g => g.name.toLowerCase().includes(endStr));

            if (startIndex === -1) startIndex = 0;
            if (endIndex === -1) endIndex = monthlyGroups.length - 1;

            if (startIndex <= endIndex) {
                return monthlyGroups.slice(startIndex, endIndex + 1);
            } else {
                // Wrap around (academic intakes wrapping across new year)
                return [...monthlyGroups.slice(startIndex), ...monthlyGroups.slice(0, endIndex + 1)];
            }
        };

        // 3. Dynamic Month Extraction
        const subjectActiveMonthsMap = {};
        uniqueSubjectNames.forEach(subName => {
            const dbCourse = courses.find(c => c.name.trim().toUpperCase() === subName);
            const activeM = getActiveMonthsForCourse(dbCourse);
            subjectActiveMonthsMap[subName] = activeM.map(g => g.id);
        });

        // 4. Get Payments
        const payments = await prisma.payment.findMany({
            where: { batchId: parsedBatchId, status: 1 },
            include: { student: { select: { id: true, firstName: true, lastName: true, phone: true, whatsapp: true, nic: true } } },
            orderBy: { created_at: 'asc' }
        });

        const installmentPlans = await prisma.installment.findMany({ where: { batchId: parsedBatchId } });

        let grandTotal = 0.0;
        const studentMap = {};

        payments.forEach(p => {
            if (!p.studentId || !p.student) return;
            const paidAmount = parseFloat(p.amount || 0);
            if (paidAmount <= 0) return;

            const isUpgrade = p.remark && (p.remark.includes('[UPGRADE]') || p.remark.includes('UPGRADE'));

            if (!studentMap[p.studentId]) {
                let nic = p.student.nic || '';
                let birthYear = nic.length === 12 ? nic.substring(0, 4) : (nic.length === 10 ? '19' + nic.substring(0, 2) : '-');

                studentMap[p.studentId] = {
                    id: p.studentId,
                    studentNo: `STU-${p.studentId}`,
                    studentName: `${p.student.firstName} ${p.student.lastName}`.trim(),
                    phone: p.student.phone || '',
                    whatsapp: p.student.whatsapp || '',
                    birthYear: birthYear,
                    paymentTypes: new Set(),
                    matrixValues: {},
                    totalPaid: 0.0,
                    isUpgradeStudent: false
                };

                monthlyGroups.forEach(mg => {
                    studentMap[p.studentId].matrixValues[mg.id] = {};
                    uniqueSubjectNames.forEach(sub => {
                        studentMap[p.studentId].matrixValues[mg.id][sub] = { total: 0, Full: 0, Monthly: 0, Installment: 0 };
                    });
                });
            }

            const sData = studentMap[p.studentId];
            if (isUpgrade) sData.isUpgradeStudent = true;
            const payType = parseInt(p.payment_type);
            sData.paymentTypes.add(payType === 3 ? 'Full' : (payType === 2 ? 'Installment' : 'Monthly'));
            sData.totalPaid += paidAmount;
            grandTotal += paidAmount;

            // Subject parsing
            let enrolledSubjectData = [];
            try {
                const subs = JSON.parse(p.subjects || '[]');
                
                // Parse custom overridden prices if they exist in payment remark
                let customPricesMap = {};
                if (p.remark && p.remark.includes('[CUSTOM_PRICES:')) {
                    try {
                        const match = p.remark.match(/\[CUSTOM_PRICES:({.*?})\]/);
                        if (match) {
                            customPricesMap = JSON.parse(match[1]);
                        }
                    } catch (e) { }
                }

                subs.forEach(item => {
                    let cid = typeof item === 'object' ? parseInt(item.id) : parseInt(item);
                    let subName = cid ? courseMap[cid] : (typeof item === 'string' ? item.trim().toUpperCase() : null);
                    if (subName && uniqueSubjectNames.includes(subName) && !enrolledSubjectData.find(u => u.name === subName)) {
                        const dbCourse = courses.find(c => c.id === cid);
                        let price = dbCourse ? parseFloat(dbCourse.price || 0) : 0;
                        
                        // Apply custom override or special discount price
                        const strId = String(cid);
                        if (customPricesMap[strId] !== undefined) {
                            price = parseFloat(customPricesMap[strId]);
                        }

                        enrolledSubjectData.push({
                            name: subName,
                            price: price,
                            courseObj: dbCourse
                        });
                    }
                });
            } catch (e) { }

            if (enrolledSubjectData.length === 0) return;

            // =========================================================
            // 🔥 UNIVERSAL RATIO ENGINE (WITH ENGLISH ISOLATION) 🔥
            // =========================================================

            // 1. English subject eka isolate kireema (matches 'ENGLISH', 'GENERAL ENGLISH', etc.)
            const englishSub = enrolledSubjectData.find(s => s.name.toUpperCase().includes('ENGLISH'));
            const otherSubs = enrolledSubjectData.filter(s => !s.name.toUpperCase().includes('ENGLISH'));

            let englishFund = 0;
            let othersTotalFund = paidAmount;

            if (englishSub) {
                englishFund = Math.min(englishSub.price, paidAmount);
                othersTotalFund = Math.max(0, paidAmount - englishFund);
            }

            // Anith subjects wala combined base price
            let totalBaseCombinedPrice = otherSubs.reduce((acc, es) => acc + es.price, 0) || otherSubs.length;

            // Count approved monthly payments this student has in the current batch
            const studentMonthlyPayments = payments.filter(pm => pm.studentId === p.studentId && parseInt(pm.payment_type) === 1);
            const alreadyPaidMonthlyCount = studentMonthlyPayments.length;

            enrolledSubjectData.forEach(es => {
                const sub = es.name;
                const isEnglish = sub.toUpperCase().includes('ENGLISH');

                // 2. Fund Allocation
                let subjectAllocatedFund = 0;
                if (isEnglish) {
                    subjectAllocatedFund = englishFund;
                } else if (payType === 1) { // MONTHLY (Keep original ratio logic for others)
                    const weightRatio = totalBaseCombinedPrice > 0 ? (es.price / totalBaseCombinedPrice) : 0;
                    subjectAllocatedFund = othersTotalFund * weightRatio;
                } else { // FULL or INSTALLMENT (Divided equally among other subjects)
                    subjectAllocatedFund = othersTotalFund / (otherSubs.length || 1);
                }

                // 3. Active Months walin bedeema
                let activeGroupIds = subjectActiveMonthsMap[sub] || monthlyGroups.map(g => g.id);
                let activeMonthCount = activeGroupIds.length || 1;

                if (isEnglish) {
                    if (payType === 1) { // MONTHLY for English
                        let targetMgId = monthlyGroups.find(mg => mg.id === p.groupId)?.id || monthlyGroups[0].id;
                        if (sData.matrixValues[targetMgId]) {
                            sData.matrixValues[targetMgId][sub].Monthly += subjectAllocatedFund;
                            sData.matrixValues[targetMgId][sub].total += subjectAllocatedFund;
                        }
                    } else { // FULL or INSTALLMENT for English
                        const amountPerMonth = subjectAllocatedFund / activeMonthCount;
                        activeGroupIds.forEach(mgId => {
                            if (sData.matrixValues[mgId]) {
                                const typeKey = payType === 3 ? 'Full' : 'Installment';
                                sData.matrixValues[mgId][sub][typeKey] += amountPerMonth;
                                sData.matrixValues[mgId][sub].total += amountPerMonth;
                            }
                        });
                    }
                } else if (payType === 3) { // FULL PAYMENT
                    const startIdx = (isUpgrade && alreadyPaidMonthlyCount > 0) ? Math.min(alreadyPaidMonthlyCount, activeMonthCount - 1) : 0;
                    const divisor = activeMonthCount - startIdx;
                    const amountPerMonth = subjectAllocatedFund / (divisor || 1);

                    for (let i = startIdx; i < activeMonthCount; i++) {
                        const mgId = activeGroupIds[i];
                        if (sData.matrixValues[mgId]) {
                            sData.matrixValues[mgId][sub].Full += amountPerMonth;
                            sData.matrixValues[mgId][sub].total += amountPerMonth;
                        }
                    }
                } else if (payType === 1) { // MONTHLY
                    let targetMgId = monthlyGroups.find(mg => mg.id === p.groupId)?.id || monthlyGroups[0].id;
                    if (sData.matrixValues[targetMgId]) {
                        sData.matrixValues[targetMgId][sub].Monthly += subjectAllocatedFund;
                        sData.matrixValues[targetMgId][sub].total += subjectAllocatedFund;
                    }
                } else { // INSTALLMENT
                    // Filter down to the correct subject count to avoid 2-phase plans for 3-subject students
                    const applicablePlans = installmentPlans.filter(pl => pl.subjectCount <= (otherSubs.length || 1)).sort((a, b) => b.subjectCount - a.subjectCount);
                    const plan = applicablePlans.length > 0 ? applicablePlans[0] : null;
                    const stepDetails = plan ? JSON.parse(plan.details) : [];
                    const totalPhases = stepDetails.length || 3;
                    const instNo = p.installment_no || 1;
                    const instIdx = instNo - 1;

                    let rangeField = 'rangeNormal';
                    if (isUpgrade) {
                        if (alreadyPaidMonthlyCount === 1) rangeField = 'rangeUp1';
                        else if (alreadyPaidMonthlyCount === 2) rangeField = 'rangeUp2';
                    }

                    const currentStepConfig = stepDetails[instIdx] || {};
                    const rangeStr = currentStepConfig[rangeField];

                    let explicitStart = null;
                    let explicitEnd = null;

                    if (rangeStr && rangeStr.includes('-')) {
                        const parts = rangeStr.split('-');
                        const s = parseInt(parts[0]);
                        const e = parseInt(parts[1]);
                        if (!isNaN(s) && !isNaN(e)) {
                            explicitStart = s - 1; // 1-indexed (Month 1 -> Index 0)
                            explicitEnd = e; // non-inclusive end index
                        }
                    }

                    let start = explicitStart;
                    let end = explicitEnd;

                    if (start === null || end === null) {
                        // Fallback to mathematical calculation if no explicit range or invalid
                        const start_norm = Math.floor((instIdx * activeMonthCount) / totalPhases);
                        const end_norm = Math.floor(((instIdx + 1) * activeMonthCount) / totalPhases);
                        start = start_norm;
                        end = end_norm;
                        if (isUpgrade) {
                            start = Math.max(start, alreadyPaidMonthlyCount);
                            if (start > end) start = end;
                        }
                    }

                    // Ensure bounds
                    if (start < 0) start = 0;
                    if (end > activeMonthCount) end = activeMonthCount;
                    if (start > end) start = end;

                    const monthsToCover = end - start;
                    const amountPerMonth = monthsToCover > 0 ? subjectAllocatedFund / monthsToCover : 0;

                    for (let i = start; i < end; i++) {
                        const mgId = activeGroupIds[i];
                        if (sData.matrixValues[mgId]) {
                            sData.matrixValues[mgId][sub].Installment += amountPerMonth;
                            sData.matrixValues[mgId][sub].total += amountPerMonth;
                        }
                    }
                }
            });
        });

        // Hybrid and Upgrade detection
        Object.values(studentMap).forEach(sData => {
            if (sData.isUpgradeStudent) {
                sData.type = 'Upgrade';
            } else {
                sData.type = sData.paymentTypes.size > 1 ? 'Hybrid' : Array.from(sData.paymentTypes)[0];
            }
            delete sData.paymentTypes;
            delete sData.isUpgradeStudent;
        });

        const typeOrder = { 'Full': 1, 'Monthly': 2, 'Installment': 3, 'Upgrade': 4, 'Hybrid': 5 };
        const sortedStudents = Object.values(studentMap).sort((a, b) => {
            const wA = typeOrder[a.type] || 99;
            const wB = typeOrder[b.type] || 99;
            if (wA !== wB) return wA - wB;
            return a.id - b.id; // secondary sort by ID
        });

        res.status(200).json(safeJson({
            months: monthlyGroups,
            subjects: uniqueSubjectNames,
            students: sortedStudents,
            grandTotal: grandTotal
        }));

    } catch (error) {
        console.error("Finance Matrix Error:", error);
        res.status(500).json({ error: "Failed to load matrix" });
    }
};