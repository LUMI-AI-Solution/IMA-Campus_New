const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const safeJson = (data) => JSON.parse(JSON.stringify(data, (key, value) => typeof value === 'bigint' ? value.toString() : value));

// 🔥 Helper: Sri Lankan NIC Birth-Year Parser 🔥
const getBirthYearFromNIC = (nic) => {
    if (!nic) return null;
    const cleanNic = nic.replace(/[^0-9vxVX]/g, '').trim();
    if (cleanNic.length === 10 && (cleanNic.endsWith('v') || cleanNic.endsWith('V') || cleanNic.endsWith('x') || cleanNic.endsWith('X'))) {
        const yearPart = cleanNic.substring(0, 2);
        return 1900 + parseInt(yearPart);
    } else if (cleanNic.length === 12 && /^\d+$/.test(cleanNic)) {
        const yearPart = cleanNic.substring(0, 4);
        return parseInt(yearPart);
    }
    if (/^\d{9}$/.test(cleanNic)) {
        const yearPart = cleanNic.substring(0, 2);
        return 1900 + parseInt(yearPart);
    }
    return null;
};

// ============================================================================
// 💰 FINANCE MODULE: REVENUE ALLOCATION MATRIX (STUDENT-WISE)
// ============================================================================
exports.getFinanceMatrix = async (req, res) => {
    try {
        const { businessId, batchId } = req.query;
        if (!batchId || batchId === 'null') return res.status(400).json({ error: "Batch ID is required" });
        const parsedBatchId = parseInt(batchId);

        // 1. Group (Months)
        const rawGroups = await prisma.group.findMany({
            where: { batchId: parsedBatchId },
            orderBy: { itemOrder: 'asc' },
            select: { id: true, name: true, itemOrder: true }
        });
        const monthlyGroups = rawGroups.filter(g => !g.name.toLowerCase().includes('full payment') && !g.name.toLowerCase().includes('full'));

        // 2. Courses (Subjects) with activeMonths, default prices & groupPrices
        const courses = await prisma.course.findMany({
            where: { group: { batchId: parsedBatchId } },
            select: { id: true, name: true, activeMonths: true, price: true, groupPrices: true }
        });
        
        const courseMap = {};
        const courseDetailsMap = {};
        courses.forEach(c => {
            const cleanName = c.name.trim().toUpperCase();
            courseMap[c.id] = cleanName;
            courseDetailsMap[c.id] = {
                id: c.id,
                name: cleanName,
                activeMonths: c.activeMonths || 12,
                price: c.price || 0.0,
                groupPrices: c.groupPrices
            };
        });
        const uniqueSubjectNames = [...new Set(Object.values(courseMap))];

        // 3. Approved Payments with Student details
        const payments = await prisma.payment.findMany({
            where: { batchId: parsedBatchId, status: 1 },
            include: { student: true }, 
            orderBy: { created_at: 'asc' }
        });

        // Fetch installment plans to determine phases dynamically
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
            if (paidAmount <= 0) return;

            // Initialize student object if not exists
            if (!studentMap[p.studentId]) {
                studentMap[p.studentId] = {
                    id: p.studentId,
                    studentNo: p.student.studentNo || `STU-${p.studentId}`,
                    studentName: `${p.student.firstName} ${p.student.lastName}`.trim(),
                    phone: p.student.phone,
                    whatsapp: p.student.whatsapp,
                    birthYear: getBirthYearFromNIC(p.student.nic) || 'N/A',
                    type: 'Monthly', // Resolved dynamically at the end
                    hasFullPayment: false,
                    hasInstallmentPayment: false,
                    hasMonthlyPayment: false,
                    matrixValues: {}, 
                    totalPaid: 0.0
                };
                
                // Initialize values to 0.0
                monthlyGroups.forEach(mg => {
                    studentMap[p.studentId].matrixValues[mg.id] = {};
                    uniqueSubjectNames.forEach(sub => {
                        studentMap[p.studentId].matrixValues[mg.id][sub] = 0.0;
                    });
                });
            }

            const sData = studentMap[p.studentId];
            const payType = parseInt(p.payment_type);

            // Update flags for final type & hybrid student detection
            if (payType === 3) sData.hasFullPayment = true;
            else if (payType === 2) sData.hasInstallmentPayment = true;
            else if (payType === 1) sData.hasMonthlyPayment = true;

            sData.totalPaid += paidAmount;
            grandTotal += paidAmount;

            // Extract subjects enrolled in this payment
            let enrolledSubjectNames = [];
            if (p.subjects) {
                try {
                    const subs = JSON.parse(p.subjects);
                    subs.forEach(item => {
                        if (typeof item === 'object' && item.id && courseMap[parseInt(item.id)]) enrolledSubjectNames.push(courseMap[parseInt(item.id)]);
                        else if (typeof item === 'string' && isNaN(parseInt(item))) enrolledSubjectNames.push(item.trim().toUpperCase());
                        else if (!isNaN(parseInt(item)) && courseMap[parseInt(item)]) enrolledSubjectNames.push(courseMap[parseInt(item)]);
                    });
                } catch(e) {}
            }

            enrolledSubjectNames = [...new Set(enrolledSubjectNames)].filter(sub => uniqueSubjectNames.includes(sub));
            const numSubjects = enrolledSubjectNames.length;
            if (numSubjects === 0) return;

            // Match enrolled subject names to database courses and resolve exact groupPrices if applicable
            const enrolledCoursesList = enrolledSubjectNames.map(subName => {
                const courseId = Object.keys(courseMap).find(id => courseMap[id] === subName);
                if (courseId) {
                    const cDetails = courseDetailsMap[courseId];
                    let finalPrice = cDetails.price;
                    
                    // Look up group specific price if payment is for a specific group
                    if (p.groupId && cDetails.groupPrices) {
                        try {
                            const gps = JSON.parse(cDetails.groupPrices);
                            const matchGp = gps.find(gp => parseInt(gp.groupId) === p.groupId);
                            if (matchGp && matchGp.price !== undefined) {
                                finalPrice = parseFloat(matchGp.price);
                            }
                        } catch (e) {}
                    }
                    return {
                        ...cDetails,
                        price: finalPrice
                    };
                }
                return { name: subName, activeMonths: 12, price: 1000.0 };
            });

            // Calculate total price of standard subjects to split payment proportionally (handles bundle discounts automatically!)
            const totalStandardPrice = enrolledCoursesList.reduce((sum, c) => sum + c.price, 0);

            // Proportional distribution of payment among subjects (handles discounts correctly)
            const subjectAmountAllocations = enrolledCoursesList.map(course => {
                let allocatedAmt = 0;
                if (totalStandardPrice > 0) {
                    allocatedAmt = (course.price / totalStandardPrice) * paidAmount;
                } else {
                    allocatedAmt = paidAmount / numSubjects;
                }
                return {
                    course: course,
                    amount: allocatedAmt
                };
            });

            // ================= ALLOCATION LOGIC INTO MATRIX =================
            subjectAmountAllocations.forEach(item => {
                const course = item.course;
                const courseAmt = item.amount;
                const activeMonths = course.activeMonths || 12;

                if (payType === 3) {
                    // Full payment: split by activeMonths and distribute to the first N months
                    if (monthlyGroups.length > 0) {
                        const amountPerMonth = courseAmt / activeMonths;
                        const limit = Math.min(activeMonths, monthlyGroups.length);
                        for (let i = 0; i < limit; i++) {
                            const mgId = monthlyGroups[i].id;
                            sData.matrixValues[mgId][course.name] += amountPerMonth;
                            monthlyTotals[mgId] += amountPerMonth;
                        }
                    }
                } else if (payType === 1) {
                    // Monthly payment: goes entirely to that specific month group
                    let targetGroupId = p.groupId;
                    let mgExists = monthlyGroups.find(mg => mg.id === targetGroupId);
                    
                    if (!mgExists && monthlyGroups.length > 0) {
                        mgExists = monthlyGroups[0];
                        targetGroupId = mgExists.id;
                    }

                    if (mgExists) {
                        sData.matrixValues[targetGroupId][course.name] += courseAmt;
                        monthlyTotals[targetGroupId] += courseAmt;
                    }
                } else if (payType === 2) {
                    // Installment: 2-phases or 3-phases
                    const currentInstNo = p.installment_no || 1;
                    
                    // Fetch installment plan dynamically to get actual phase counts
                    const plan = installmentPlans.find(pl => pl.subjectCount <= numSubjects);
                    let totalPhases = 2; // default
                    if (plan && plan.details) {
                        try {
                            const parsedDetails = JSON.parse(plan.details);
                            if (Array.isArray(parsedDetails)) totalPhases = parsedDetails.length;
                        } catch(e) {}
                    }

                    let phaseMonths = 6;
                    let startIndex = 0;
                    
                    if (totalPhases === 3) {
                        // 3 Installments: 4, 4, 4 months
                        phaseMonths = 4;
                        if (currentInstNo === 1) startIndex = 0;
                        else if (currentInstNo === 2) startIndex = 4;
                        else if (currentInstNo === 3) startIndex = 8;
                    } else {
                        // 2 Installments (Default): 6, 6 months
                        phaseMonths = 6;
                        if (currentInstNo === 1) startIndex = 0;
                        else if (currentInstNo === 2) startIndex = 6;
                    }

                    const endIndex = Math.min(startIndex + phaseMonths, monthlyGroups.length);
                    const actualMonthsCovered = endIndex - startIndex;

                    if (actualMonthsCovered > 0) {
                        const amountPerMonth = courseAmt / actualMonthsCovered;
                        for (let i = startIndex; i < endIndex; i++) {
                            const mgId = monthlyGroups[i].id;
                            sData.matrixValues[mgId][course.name] += amountPerMonth;
                            monthlyTotals[mgId] += amountPerMonth;
                        }
                    } else if (monthlyGroups.length > 0) {
                        // Fallback
                        const fallbackMgId = monthlyGroups[0].id;
                        sData.matrixValues[fallbackMgId][course.name] += courseAmt;
                        monthlyTotals[fallbackMgId] += courseAmt;
                    }
                }
            });
        });

        // Convert student map to array and flag hybrid students & final enrollment types
        const studentsArray = Object.values(studentMap).map(stu => {
            // Priority for enrollment type label: Full > Installment > Monthly
            if (stu.hasFullPayment) {
                stu.type = 'Full';
            } else if (stu.hasInstallmentPayment) {
                stu.type = 'Installment';
            } else {
                stu.type = 'Monthly';
            }
            
            // A hybrid student has paid for Full/Installment AND Monthly in the same batch
            stu.isHybrid = (stu.hasFullPayment || stu.hasInstallmentPayment) && stu.hasMonthlyPayment;
            return stu;
        });

        // Sort students: Full -> Installment -> Monthly, and then by name
        const sortOrder = { 'Full': 1, 'Installment': 2, 'Monthly': 3 };
        studentsArray.sort((a, b) => {
            const scoreA = sortOrder[a.type] || 99;
            const scoreB = sortOrder[b.type] || 99;
            if (scoreA !== scoreB) return scoreA - scoreB;
            return a.studentName.localeCompare(b.studentName);
        });

        res.status(200).json(safeJson({
            months: monthlyGroups,
            subjects: uniqueSubjectNames,
            students: studentsArray,
            monthlyTotals: monthlyTotals,
            grandTotal: grandTotal
        }));

    } catch (error) {
        console.error("Finance Matrix Calculation Error:", error);
        res.status(500).json({ error: "Failed to generate Finance Matrix" });
    }
};