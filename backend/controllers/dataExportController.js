const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const safeJson = (data) => JSON.parse(JSON.stringify(data, (key, value) => typeof value === 'bigint' ? value.toString() : value));

exports.getModuleOneMatrix = async (req, res) => {
    try {
        const { businessId, batchId } = req.query;

        if (!batchId || batchId === 'null') {
            return res.status(400).json({ error: "Batch ID is required for Matrix view" });
        }

        const rawGroups = await prisma.group.findMany({
            where: { batchId: parseInt(batchId) },
            orderBy: { itemOrder: 'asc' },
            select: { id: true, name: true, itemOrder: true, type: true }
        });

        const groups = rawGroups.filter(g => !g.name.toLowerCase().includes('full payment') && !g.name.toLowerCase().includes('full'));

        const courses = await prisma.course.findMany({
            where: { group: { batchId: parseInt(batchId) } },
            select: { id: true, name: true }
        });

        const courseMap = {};
        courses.forEach(c => courseMap[c.id] = c.name.trim().toUpperCase());
        const uniqueSubjectNames = [...new Set(Object.values(courseMap))];

        const payments = await prisma.payment.findMany({
            where: {
                batchId: parseInt(batchId),
                status: { in: [1, 4] } 
            },
            select: { studentId: true, groupId: true, payment_type: true, subjects: true }
        });

        const monthSubjectData = {};
        groups.forEach(g => {
            monthSubjectData[g.id] = {};
            uniqueSubjectNames.forEach(sub => {
                monthSubjectData[g.id][sub] = { full: new Set(), monthly: new Set(), install: new Set() };
            });
        });

        payments.forEach(p => {
            if (!p.subjects || !p.studentId || !p.groupId) return;

            let enrolledSubjects = [];
            try {
                const subs = JSON.parse(p.subjects);
                subs.forEach(item => {
                    if (typeof item === 'object' && item.id && courseMap[parseInt(item.id)]) {
                        enrolledSubjects.push(courseMap[parseInt(item.id)]);
                    } else if (typeof item === 'string' && isNaN(parseInt(item))) {
                        enrolledSubjects.push(item.trim().toUpperCase());
                    } else if (!isNaN(parseInt(item)) && courseMap[parseInt(item)]) {
                        enrolledSubjects.push(courseMap[parseInt(item)]);
                    }
                });
            } catch(e) { return; }

            enrolledSubjects = [...new Set(enrolledSubjects)];
            
            const payType = parseInt(p.payment_type);
            const groupIndex = groups.findIndex(g => g.id === p.groupId);
            const targetGroupIndex = groupIndex !== -1 ? groupIndex : 0; 
            if (groups.length === 0) return;

            enrolledSubjects.forEach(sub => {
                if (!uniqueSubjectNames.includes(sub)) return;

                if (payType === 3) {
                    for (let i = targetGroupIndex; i < groups.length; i++) {
                        monthSubjectData[groups[i].id][sub].full.add(p.studentId);
                    }
                } else if (payType === 2 && groupIndex !== -1) {
                    monthSubjectData[groups[groupIndex].id][sub].install.add(p.studentId);
                } else if (payType === 1 && groupIndex !== -1) {
                    monthSubjectData[groups[groupIndex].id][sub].monthly.add(p.studentId);
                }
            });
        });

        const matrix = {};
        uniqueSubjectNames.forEach(sub => {
            matrix[sub] = {};
            let prevActiveSet = new Set();
            let prevNonFullSet = new Set(); 
            let prevFullSet = new Set(); // 🔥 අලුතෙන් දැම්මේ: ගිය මාසේ Full හිටපු අයව වෙනම තියාගන්න

            groups.forEach((g, index) => {
                const currentFull = monthSubjectData[g.id][sub].full;
                const currentMonthly = monthSubjectData[g.id][sub].monthly;
                const currentInstall = monthSubjectData[g.id][sub].install;
                
                const currentActiveSet = new Set([...currentFull, ...currentMonthly, ...currentInstall]);

                let grown = 0;
                let dropped = 0;
                let upgraded = 0; 

                if (index > 0) {
                    currentActiveSet.forEach(id => {
                        if (!prevActiveSet.has(id)) grown++;
                    });
                    prevActiveSet.forEach(id => {
                        if (!currentActiveSet.has(id)) dropped++;
                    });
                    
                    // 🔥 FIX: ගිය මාසේ Monthly හිටපු, හැබැයි ගිය මාසේ Full එකේ හිටපු නැති අය විතරක් Upgrade එකක් විදිහට ගන්නවා
                    currentFull.forEach(id => {
                        if (prevNonFullSet.has(id) && !prevFullSet.has(id)) upgraded++;
                    });
                }

                const prevTotal = prevActiveSet.size;
                const prevNonFullTotal = prevNonFullSet.size - Array.from(prevNonFullSet).filter(id => prevFullSet.has(id)).length; // 🔥

                const grownPct = prevTotal > 0 ? ((grown / prevTotal) * 100).toFixed(1) : (grown > 0 ? 100 : 0);
                const droppedPct = prevTotal > 0 ? ((dropped / prevTotal) * 100).toFixed(1) : 0;
                const upgradedPct = prevNonFullTotal > 0 ? ((upgraded / prevNonFullTotal) * 100).toFixed(1) : 0;

                matrix[sub][g.id] = {
                    full: currentFull.size,
                    monthly: currentMonthly.size,
                    install: currentInstall.size,
                    total: currentActiveSet.size,
                    grown,
                    dropped,
                    upgraded,
                    grownPct: parseFloat(grownPct),
                    droppedPct: parseFloat(droppedPct),
                    upgradedPct: parseFloat(upgradedPct) 
                };

                prevActiveSet = currentActiveSet;
                prevNonFullSet = new Set([...currentMonthly, ...currentInstall]);
                prevFullSet = currentFull; // 🔥 Update for next loop
            });
        });

        const summary = {};
        let prevSummaryActiveSet = new Set();
        let prevSummaryNonFullSet = new Set(); 
        let prevSummaryFullSet = new Set(); // 🔥 අලුතෙන්

        groups.forEach((g, index) => {
            let monthFullSet = new Set();
            let monthMonthlySet = new Set();
            let monthInstallSet = new Set();

            uniqueSubjectNames.forEach(sub => {
                monthSubjectData[g.id][sub].full.forEach(id => monthFullSet.add(id));
                monthSubjectData[g.id][sub].monthly.forEach(id => monthMonthlySet.add(id));
                monthSubjectData[g.id][sub].install.forEach(id => monthInstallSet.add(id));
            });

            const monthActiveSet = new Set([...monthFullSet, ...monthMonthlySet, ...monthInstallSet]);

            let grown = 0;
            let dropped = 0;
            let upgraded = 0;

            if (index > 0) {
                monthActiveSet.forEach(id => {
                    if (!prevSummaryActiveSet.has(id)) grown++;
                });
                prevSummaryActiveSet.forEach(id => {
                    if (!monthActiveSet.has(id)) dropped++;
                });
                
                // 🔥 FIX: Summary එකෙත් ඒ Logic එකම දානවා
                monthFullSet.forEach(id => {
                    if (prevSummaryNonFullSet.has(id) && !prevSummaryFullSet.has(id)) upgraded++; 
                });
            }

            const prevTotal = prevSummaryActiveSet.size;
            const prevNonFullTotal = prevSummaryNonFullSet.size - Array.from(prevSummaryNonFullSet).filter(id => prevSummaryFullSet.has(id)).length; // 🔥

            const grownPct = prevTotal > 0 ? ((grown / prevTotal) * 100).toFixed(1) : (grown > 0 ? 100 : 0);
            const droppedPct = prevTotal > 0 ? ((dropped / prevTotal) * 100).toFixed(1) : 0;
            const upgradedPct = prevNonFullTotal > 0 ? ((upgraded / prevNonFullTotal) * 100).toFixed(1) : 0;

            summary[g.id] = {
                full: monthFullSet.size,
                monthly: monthMonthlySet.size,
                install: monthInstallSet.size,
                total: monthActiveSet.size,
                grown,
                dropped,
                upgraded, 
                grownPct: parseFloat(grownPct),
                droppedPct: parseFloat(droppedPct),
                upgradedPct: parseFloat(upgradedPct) 
            };

            prevSummaryActiveSet = monthActiveSet;
            prevSummaryNonFullSet = new Set([...monthMonthlySet, ...monthInstallSet]);
            prevSummaryFullSet = monthFullSet; // 🔥 Update for next loop
        });

        res.status(200).json(safeJson({
            months: groups,
            subjects: uniqueSubjectNames,
            matrix,
            summary
        }));

    } catch (error) {
        console.error("Data Export Matrix Error:", error);
        res.status(500).json({ error: "Failed to generate data matrix" });
    }
};

// ============================================================================
// MODULE 02: CONVERSION & DROP ANALYTICS (INQUIRIES, DISTRIBUTION, DROPS)
// ============================================================================
exports.getModuleTwoAnalytics = async (req, res) => {
    try {
        const { businessId, batchId } = req.query;

        if (!batchId || batchId === 'null') {
            return res.status(400).json({ error: "Batch ID is required for Analytics" });
        }

        const parsedBatchId = parseInt(batchId);
        const parsedBizId = parseInt(businessId);

        // ---------------------------------------------------------
        // 1. SUMMARY CARDS DATA (Inquiries & Real Enrolled)
        // ---------------------------------------------------------
        const freeSeminarCount = await prisma.lead.count({
            where: { batchId: parsedBatchId, campaignType: 'FREE_SEMINAR' }
        });

        const openSeminarCount = await prisma.lead.count({
            where: { batchId: parsedBatchId, campaignType: 'AFTER_SEMINAR', inquiryType: 'OPEN_SEMINAR' }
        });

        const newInqCount = await prisma.lead.count({
            where: { batchId: parsedBatchId, campaignType: 'AFTER_SEMINAR', inquiryType: 'NEW_INQ' }
        });

        // ---------------------------------------------------------
        // 2. FETCH PAYMENTS, GROUPS & COURSES
        // ---------------------------------------------------------
        const allGroups = await prisma.group.findMany({
            where: { batchId: parsedBatchId },
            orderBy: { itemOrder: 'asc' },
            select: { id: true, name: true, itemOrder: true, type: true }
        });

        // Drop Analytics වලට Full Payment Group එක ඕනේ නෑ, ඒ නිසා ඒක අයින් කරපු සෙට් එකකුත් හදාගන්නවා
        const monthlyGroups = allGroups.filter(g => !g.name.toLowerCase().includes('full payment') && !g.name.toLowerCase().includes('full'));

        const courses = await prisma.course.findMany({
            where: { group: { batchId: parsedBatchId } },
            select: { id: true, name: true }
        });

        const courseMap = {};
        courses.forEach(c => courseMap[c.id] = c.name.trim().toUpperCase());
        const uniqueSubjectNames = [...new Set(Object.values(courseMap))];

        const payments = await prisma.payment.findMany({
            where: { batchId: parsedBatchId, status: { in: [1, 4] } }, // Approved & Post Pay
            select: { studentId: true, groupId: true, payment_type: true, subjects: true }
        });

        // Real Unique Enrolled Students (Summary Card එකට)
        const uniqueStudents = new Set();
        const studentSubjectsCount = {}; // For Core Average Logic

        // Data Structures
        const distributionData = {}; // For Group Distribution Table
        const dropData = {};         // For Drop Analytics Table

        uniqueSubjectNames.forEach(sub => {
            distributionData[sub] = {};
            dropData[sub] = {};
            
            allGroups.forEach(g => { distributionData[sub][g.id] = new Set(); });
            monthlyGroups.forEach(mg => { dropData[sub][mg.id] = { active: new Set(), dropped: 0 }; });
        });

        // ---------------------------------------------------------
        // 3. PROCESS PAYMENTS
        // ---------------------------------------------------------
        payments.forEach(p => {
            if (!p.subjects || !p.studentId || !p.groupId) return;

            uniqueStudents.add(p.studentId); // Real Enrolled Students Count එකට එකතු කරනවා

            if (!studentSubjectsCount[p.studentId]) {
                studentSubjectsCount[p.studentId] = new Set();
            }

            let enrolledSubjects = [];
            try {
                const subs = JSON.parse(p.subjects);
                subs.forEach(item => {
                    if (typeof item === 'object' && item.id && courseMap[parseInt(item.id)]) {
                        enrolledSubjects.push(courseMap[parseInt(item.id)]);
                        studentSubjectsCount[p.studentId].add(courseMap[parseInt(item.id)]);
                    } else if (typeof item === 'string' && isNaN(parseInt(item))) {
                        enrolledSubjects.push(item.trim().toUpperCase());
                        studentSubjectsCount[p.studentId].add(item.trim().toUpperCase());
                    } else if (!isNaN(parseInt(item)) && courseMap[parseInt(item)]) {
                        enrolledSubjects.push(courseMap[parseInt(item)]);
                        studentSubjectsCount[p.studentId].add(courseMap[parseInt(item)]);
                    }
                });
            } catch(e) { return; }

            enrolledSubjects = [...new Set(enrolledSubjects)];
            const payType = parseInt(p.payment_type);

            enrolledSubjects.forEach(sub => {
                if (!uniqueSubjectNames.includes(sub)) return;

                // A) Group Distribution: ඒ ඒ Group එකට අදාලව ළමයි දානවා (Full Payment Group එකත් එක්කම)
                if (distributionData[sub][p.groupId]) {
                    distributionData[sub][p.groupId].add(p.studentId);
                }

                // B) Drop Analytics: අර කලින් Logic එකමයි. Full නම් හැම මාසෙටම දානවා.
                const mgIndex = monthlyGroups.findIndex(mg => mg.id === p.groupId);
                const targetMgIndex = mgIndex !== -1 ? mgIndex : 0;

                if (monthlyGroups.length > 0) {
                    if (payType === 3) { // Full
                        for (let i = targetMgIndex; i < monthlyGroups.length; i++) {
                            dropData[sub][monthlyGroups[i].id].active.add(p.studentId);
                        }
                    } else if (mgIndex !== -1) { // Monthly / Installment
                        dropData[sub][monthlyGroups[mgIndex].id].active.add(p.studentId);
                    }
                }
            });
        });

        // ---------------------------------------------------------
        // 4. CALCULATE DROPS (Month over Month)
        // ---------------------------------------------------------
        const finalDropStats = {};
        uniqueSubjectNames.forEach(sub => {
            finalDropStats[sub] = { months: {}, totalSubjectDrops: 0 };
            let prevActiveSet = new Set();

            monthlyGroups.forEach((mg, index) => {
                const currentActiveSet = dropData[sub][mg.id].active;
                let dropped = 0;

                if (index > 0) {
                    prevActiveSet.forEach(id => {
                        if (!currentActiveSet.has(id)) dropped++;
                    });
                }

                finalDropStats[sub].months[mg.id] = dropped;
                finalDropStats[sub].totalSubjectDrops += dropped;
                prevActiveSet = currentActiveSet;
            });
        });

        // ---------------------------------------------------------
        // 5. CORE AVERAGE LOGIC (3 Subjects / 9 Subjects)
        // ---------------------------------------------------------
        const biz = await prisma.business.findUnique({ where: { id: parsedBizId } });
        const isOL = biz ? (biz.name.toLowerCase().includes('o/l') || biz.name.toLowerCase().includes('ordinary')) : false;

        let coreAverageCount = 0;

        Object.values(studentSubjectsCount).forEach(subsSet => {
            if (isOL) {
                if (subsSet.size >= 9) coreAverageCount++;
            } else {
                let mainCount = 0;
                subsSet.forEach(s => {
                    const sn = s.toLowerCase();
                    // English, General, GIT අයින් කරලා Main subjects ගාණ බලනවා
                    if (!sn.includes('english') && !sn.includes('general') && !sn.includes('git')) {
                        mainCount++;
                    }
                });
                if (mainCount >= 3) coreAverageCount++;
            }
        });

        // ---------------------------------------------------------
        // 6. FORMAT RESPONSE DATA
        // ---------------------------------------------------------
        // Distribution Table එකට යවන්න ලේසි වෙන්න Size එක විතරක් ගන්නවා
        const formattedDistribution = {};
        uniqueSubjectNames.forEach(sub => {
            formattedDistribution[sub] = {};
            let rowTotal = 0;
            allGroups.forEach(g => {
                const count = distributionData[sub][g.id].size;
                formattedDistribution[sub][g.id] = count;
                rowTotal += count;
            });
            formattedDistribution[sub]['Total'] = rowTotal;
        });

        res.status(200).json(safeJson({
            summaryCards: {
                freeSeminar: freeSeminarCount,
                openSeminar: openSeminarCount,
                newInquiries: newInqCount,
                realEnrolled: uniqueStudents.size
            },
            coreAverage: coreAverageCount,
            allGroups: allGroups, // Columns for Distribution Table
            monthlyGroups: monthlyGroups, // Columns for Drop Table
            subjects: uniqueSubjectNames,
            distributionData: formattedDistribution,
            dropData: finalDropStats
        }));

    } catch (error) {
        console.error("Module 02 Analytics Error:", error);
        res.status(500).json({ error: "Failed to load Module 02 Analytics" });
    }
};