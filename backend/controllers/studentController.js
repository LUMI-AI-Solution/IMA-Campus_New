const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');
const jwt = require('jsonwebtoken'); // 🔥 FIX: Ghost login error fix
const bcrypt = require('bcrypt');
const axios = require('axios');
const streamCache = {};

// 🔥 NEW: BigInt convert karana helper function eka meka hama thanatama pawichi karanawa
const safeJson = (data) => JSON.parse(JSON.stringify(data, (key, value) => typeof value === 'bigint' ? value.toString() : value));

// 1. Dashboard
exports.getStudentDashboard = async (req, res) => {
    try {
        const studentId = req.user?.userId || req.user?.id;

        // 1. ළමයාගේ Valid Payments ගන්නවා
        const validPayments = await prisma.payment.findMany({
            where: { studentId: parseInt(studentId), status: { in: [1, 4] } }
        });

        // 2. ළමයා ඉන්න Business IDs සහ Batch IDs වෙන් කරලා BigInt වලට හරවනවා
        const enrolledBusinessIds = [...new Set(validPayments.map(p => p.businessId).filter(Boolean))].map(id => BigInt(id));
        const enrolledBatchIds = [...new Set(validPayments.map(p => p.batchId).filter(Boolean))].map(id => BigInt(id));

        // 3. 🔥 FIX: ළමයාට අදාළ පෝස්ට් විතරක් Filter කරලා ගන්නවා
        const posts = await prisma.post.findMany({
            where: {
                OR: [
                    { business_id: null }, // හැමෝටම පේන පොදු පෝස්ට් (All)
                    { 
                        business_id: { in: enrolledBusinessIds }, 
                        batch_id: null // ළමයා ඉන්න Business එකේ ඔක්කොම Batches වලට දාපු පෝස්ට්
                    }, 
                    { 
                        business_id: { in: enrolledBusinessIds },
                        batch_id: { in: enrolledBatchIds } // ළමයා ඉන්න Specific Batch එකට දාපු පෝස්ට්
                    }
                ]
            },
            orderBy: { created_at: 'desc' },
            take: 5
        });

        let enrolledSubjectIds = new Set();
        validPayments.forEach(p => {
            if (p.subjects) {
                try {
                    const subs = JSON.parse(p.subjects);
                    subs.forEach(id => enrolledSubjectIds.add(parseInt(id)));
                } catch (e) {}
            }
        });

        let alerts = [];
        let duePaymentsList = [];
        
        const pendingPayments = await prisma.payment.findMany({
            where: { 
                studentId: parseInt(studentId),
                OR: [
                    { status: 0 },
                    {
                        status: { in: [2, 5] },
                        due_date: { not: null }
                    }
                ]
            },
            include: { business: true, batch: true }
        });

        const today = new Date();

        // -- PROACTIVE UPCOMING MONTHLY PAYMENTS LOGIC --
        // Check if today is >= 24th of the month OR <= 15th of the month
        if (today.getDate() >= 24 || today.getDate() <= 15) {
            // Find valid monthly payments for this student
            const validMonthly = await prisma.payment.findMany({
                where: { studentId: parseInt(studentId), status: { in: [0, 1, 4] }, payment_type: 1 },
                include: { group: true, batch: { include: { business: true } } }
            });
            
            const batchMap = {};
            validMonthly.forEach(p => {
                if (!p.batchId || !p.group) return;
                if (!batchMap[p.batchId]) {
                    batchMap[p.batchId] = { batch: p.batch, highestGroup: p.group, subjects: p.subjects };
                } else {
                    if (p.group.itemOrder > batchMap[p.batchId].highestGroup.itemOrder) {
                        batchMap[p.batchId].highestGroup = p.group;
                        batchMap[p.batchId].subjects = p.subjects;
                    }
                }
            });

            for (let batchId in batchMap) {
                const { batch, highestGroup, subjects } = batchMap[batchId];
                
                // Find next group
                const nextGroup = await prisma.group.findFirst({
                    where: {
                        batchId: parseInt(batchId),
                        type: 1, // assuming monthly groups are type 1
                        itemOrder: { gt: highestGroup.itemOrder }
                    },
                    orderBy: { itemOrder: 'asc' }
                });

                if (nextGroup) {
                    // Check if user already has a pending/completed payment for this group
                    const existingPayment = await prisma.payment.findFirst({
                        where: {
                            studentId: parseInt(studentId),
                            batchId: parseInt(batchId),
                            groupId: nextGroup.id,
                            status: { not: 3 } // not rejected
                        }
                    });

                    if (!existingPayment) {
                        let amount = 0;
                        let parsedSubjects = [];
                        try { parsedSubjects = subjects ? JSON.parse(subjects) : []; } catch(e) {}
                        
                        if (parsedSubjects.length > 0) {
                            const courseIds = parsedSubjects.map(id => parseInt(id));
                            const courses = await prisma.course.findMany({
                                where: { id: { in: courseIds } }
                            });
                            courses.forEach(c => {
                                let cPrice = c.price || 0;
                                if (c.groupPrices) {
                                    try {
                                        const gp = JSON.parse(c.groupPrices);
                                        if (gp[nextGroup.id]) cPrice = Number(gp[nextGroup.id]);
                                    } catch(e) {}
                                }
                                amount += cPrice;
                            });
                        }

                        // Push a virtual payment
                        const courseName = `${batch.business?.name || ''} - ${batch.name || ''}`;
                        const nextMonthDueDate = new Date(today.getFullYear(), today.getMonth() + 1, 5); // 5th of next month

                        duePaymentsList.push({
                            id: `virtual_${nextGroup.id}`,
                            isUpcomingMonthly: true,
                            groupId: nextGroup.id,
                            batchId: batch.id,
                            businessId: batch.businessId,
                            subjects: subjects, // raw JSON string
                            courseName: courseName,
                            amount: amount,
                            dueDate: nextMonthDueDate,
                            isInstallment: false,
                            diffDays: Math.ceil((nextMonthDueDate - today) / (1000 * 60 * 60 * 24)),
                            nextGroupName: nextGroup.name
                        });
                    }
                }
            }
        }
        // ------------------------------------------------

        pendingPayments.forEach(p => {
            if (p.due_date && (p.method !== 'Slip' || p.status === 2 || p.status === 5)) {
                const dueDate = new Date(p.due_date);
                const diffTime = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24)); 
                const courseName = `${p.business?.name || ''} - ${p.batch?.name || ''}`;

                duePaymentsList.push({
                    id: p.id,
                    courseName: courseName,
                    amount: p.amount || 0,
                    dueDate: p.due_date,
                    isInstallment: p.payment_type === 2,
                    installmentNo: p.installment_no,
                    diffDays: diffTime
                });

                if (diffTime < 0) {
                    alerts.push({ type: 'locked', msg: `Your payment for ${courseName} is OVERDUE by ${Math.abs(diffTime)} days. Please pay immediately.` });
                } else if (diffTime <= 1) {
                    alerts.push({ type: 'danger', msg: `Your payment for ${courseName} is due TOMORROW!` });
                } else if (diffTime <= 5) {
                    alerts.push({ type: 'warning', msg: `Your payment for ${courseName} is due in ${diffTime} days.` });
                }
            }
        });

        let unlockedVideos = 0;
        let studyMaterials = 0;
        let upcomingLives = []; 

        if (enrolledSubjectIds.size > 0) {
            const courseIds = Array.from(enrolledSubjectIds).map(id => BigInt(id));
            const linkedContents = await prisma.contentCourse.findMany({ where: { course_id: { in: courseIds } } });
            
            if (linkedContents.length > 0) {
                const contentIds = linkedContents.map(lc => lc.content_id);
                const allContents = await prisma.content.findMany({ where: { id: { in: contentIds } } });
                
                unlockedVideos = allContents.filter(c => ['live', 'recording', '1', '2'].includes(c.contentType)).length;
                studyMaterials = allContents.filter(c => ['document', 'paper', 'sPaper', '3', '4', '5'].includes(c.contentType)).length;

                const startOfToday = new Date();
                startOfToday.setHours(0, 0, 0, 0); 

                const liveClasses = allContents
                    .filter(c => ['live', '1'].includes(c.contentType) && c.date && new Date(c.date) >= startOfToday)
                    .sort((a, b) => new Date(a.date) - new Date(b.date)); 

                for (const lc of liveClasses) {
                    const courseLink = linkedContents.find(l => l.content_id === lc.id);
                    const courseDetails = courseLink ? await prisma.course.findUnique({ where: { id: Number(courseLink.course_id) } }) : null;

                    upcomingLives.push({
                        id: lc.id,
                        title: lc.title,
                        link: lc.link,
                        date: lc.date,
                        startTime: lc.startTime,
                        endTime: lc.endTime,
                        courseName: courseDetails?.name || 'Live Class'
                    });
                }
            }
        }

        res.status(200).json(safeJson({
            enrolledCount: enrolledSubjectIds.size, 
            upcomingLives: upcomingLives, 
            posts: posts, // 🔥 ළමයාගේ පෝස්ට් විතරයි යන්නේ
            alerts: alerts,
            duePayments: duePaymentsList,
            stats: { unlockedVideos, studyMaterials }
        }));
    } catch (error) {
        console.error("Dashboard Load Error:", error);
        res.status(500).json({ error: "Dashboard load failed" });
    }
};

// 2. Enroll Businesses
exports.getAvailableEnrollments = async (req, res) => {
    try {
        const studentId = req.user?.userId || req.user?.id;

        // ළමයාගේ valid payments ගන්නවා
        const validPayments = await prisma.payment.findMany({
            where: { studentId: parseInt(studentId), status: { in: [0, 1, 4] } }
        });

        // ළමයා enroll වෙලා ඉන්න Batch IDs
        const enrolledBatchIds = [...new Set(validPayments.map(p => p.batchId).filter(Boolean))].map(id => parseInt(id));

        const businesses = await prisma.business.findMany({
            where: { status: 1 },
            include: {
                batches: {
                    where: { status: 1 },
                    include: {
                        groups: { include: { courses: true } }
                    }
                }
            }
        });

        const safeData = safeJson(businesses);
        
        for (let i = 0; i < safeData.length; i++) {
            for (let j = 0; j < safeData[i].batches.length; j++) {
                const currentBatch = safeData[i].batches[j];
                const batchInstallments = await prisma.installment.findMany({
                    where: { batchId: parseInt(currentBatch.id) }
                });
                currentBatch.installment_plans_parsed = batchInstallments || [];
            }
        }

        res.status(200).json({ businesses: safeData });
    } catch (error) {
        console.error("Error in getAvailableEnrollments:", error);
        res.status(500).json({ error: "Failed to load courses", details: error.message });
    }
};

// 🔥 NEW: ළමයා දැනටමත් ගෙවලා තියෙන subjects වල IDs ගන්නවා
exports.getMyEnrolledSubjects = async (req, res) => {
    try {
        const studentId = req.user?.userId || req.user?.id;
        
        const validPayments = await prisma.payment.findMany({
            where: { studentId: parseInt(studentId), status: { in: [0, 1, 4] } },
            include: { group: true }
        });

        let enrolled = [];
        let groupPaidSubjects = {};
        let fullPaidSubjects = [];

        validPayments.forEach(p => {
            if (p.subjects) {
                try { 
                    const parsed = JSON.parse(p.subjects);
                    const numParsed = parsed.map(Number);
                    enrolled.push(...numParsed); 
                    enrolled.push(...parsed.map(String)); 
                    
                    if (p.payment_type === 3 || p.payment_type === 2) {
                        fullPaidSubjects.push(...numParsed);
                        fullPaidSubjects.push(...parsed.map(String));
                    }

                    if (p.groupId) {
                        if (!groupPaidSubjects[p.groupId]) groupPaidSubjects[p.groupId] = [];
                        groupPaidSubjects[p.groupId].push(...numParsed);
                        groupPaidSubjects[p.groupId].push(...parsed.map(String));
                    }
                } catch(e) {
                    console.error("Subject Parse Error:", e);
                }
            }
        });

        const user = await prisma.user.findUnique({
            where: { id: parseInt(studentId) },
            select: { walletBalance: true }
        });

        res.status(200).json({
            enrolledSubjects: enrolled,
            groupPaidSubjects: groupPaidSubjects,
            fullPaidSubjects: fullPaidSubjects,
            walletBalance: user?.walletBalance || 0
        });
    } catch (error) {
        console.error("Error fetching enrolled subjects:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// 3. PayHere Hash 
exports.generatePayHereHash = async (req, res) => {
    try {
        const { amount, orderId, currency } = req.body;
        
        const merchantId = process.env.PAYHERE_MERCHANT_ID || process.env.VITE_PAYHERE_MERCHANT_ID || "222646"; 
        const merchantSecret = process.env.PAYHERE_SECRET || process.env.VITE_PAYHERE_SECRET || "3113931171298094467140764830232859317793"; 

        if (!merchantId || !merchantSecret) {
            console.error("❌ Backend .env missing PayHere keys!");
            return res.status(500).json({ error: "PayHere credentials missing in server .env" });
        }

        const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
        const amountFormatted = parseFloat(amount).toFixed(2);
        
        const hashString = merchantId + orderId + amountFormatted + currency + hashedSecret;
        const hash = crypto.createHash('md5').update(hashString).digest('hex').toUpperCase();

        res.status(200).json({ hash });
    } catch (error) {
        console.error("PayHere Hash Error:", error);
        res.status(500).json({ error: "Failed to generate hash" });
    }
};

// 🔥 NEW: PayHere Notify Webhook
exports.payhereNotify = async (req, res) => {
    try {
        const { merchant_id, order_id, payhere_amount, payhere_currency, status_code, md5sig } = req.body;
        const merchantSecret = process.env.PAYHERE_SECRET;

        const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
        const hashString = merchant_id + order_id + payhere_amount + payhere_currency + status_code + hashedSecret;
        const localMd5sig = crypto.createHash('md5').update(hashString).digest('hex').toUpperCase();

        if (localMd5sig === md5sig && status_code === "2") {
            console.log(`[PayHere] Payment successfully verified for Order ID: ${order_id}`);
            
            const updatedPayment = await prisma.payment.update({
                where: { id: parseInt(order_id) },
                data: { status: 1 } 
            });

            if (updatedPayment.subjects) {
                const subIds = JSON.parse(updatedPayment.subjects).map(id => parseInt(id));
                const courses = await prisma.course.findMany({ where: { id: { in: subIds } } });

                const paymentTypeStr = parseInt(updatedPayment.payment_type) === 1 ? 'Monthly' : (parseInt(updatedPayment.payment_type) === 2 ? 'Installment' : 'Full');

                let existingDeliveredCourseIds = [];
                if (updatedPayment.payment_type === 1 && updatedPayment.groupId) {
                    const existingItems = await prisma.deliveryItem.findMany({
                        where: { delivery: { studentId: updatedPayment.studentId.toString(), paymentType: 'Monthly', payment: { groupId: updatedPayment.groupId } } },
                        select: { courseId: true }
                    });
                    existingDeliveredCourseIds = existingItems.map(i => i.courseId);
                } else if ((updatedPayment.payment_type === 2 || updatedPayment.payment_type === 3) && updatedPayment.batchId) {
                    const existingItems = await prisma.deliveryItem.findMany({
                        where: { delivery: { studentId: updatedPayment.studentId.toString(), paymentType: { in: ['Installment', 'Full'] }, payment: { batchId: updatedPayment.batchId } } },
                        select: { courseId: true }
                    });
                    existingDeliveredCourseIds = existingItems.map(i => i.courseId);
                }

                const deliverableCoursesMap = new Map();
                for (const course of courses) {
                    if (existingDeliveredCourseIds.includes(course.id)) continue;

                    
                                let deliverTute = false;
        let tuteName = course.name || "Tute";
        let tuteImage = null;
                                let parsedPType = parseInt(updatedPayment.payment_type);

                                let currentGroupId = null;
                                if (typeof updatedPayment !== 'undefined' && updatedPayment.groupId) currentGroupId = updatedPayment.groupId;
                                else if (typeof newPayment !== 'undefined' && newPayment.groupId) currentGroupId = newPayment.groupId;
                                else if (typeof payRecord !== 'undefined' && payRecord.groupId) currentGroupId = payRecord.groupId;
                                
                                if (course.groupPrices && currentGroupId) {
                                    try {
                                        const gps = JSON.parse(course.groupPrices);
                                        const match = gps.find(g => g.groupId == currentGroupId);
                                        if (match && (match.deliverTute === true || match.deliverTute === 'true')) {
                                            deliverTute = true;
                                            if (match.tuteName) tuteName = match.tuteName;
                                            if (match.tuteCover) tuteImage = match.tuteCover;
                                        }
                                    } catch(e) {}
                                }
                                
                                if (deliverTute) {
                                    const key = `${course.id}_${tuteName}`;
                                    if (!deliverableCoursesMap.has(key)) {
                                        deliverableCoursesMap.set(key, { courseId: course.id, tuteName: tuteName, tuteImage: typeof tuteImage !== 'undefined' ? tuteImage : null, quantity: 1 });
                                    }
                                }

                }
                const deliverableCourses = Array.from(deliverableCoursesMap.values());

                if (deliverableCourses.length > 0) {
                    await prisma.delivery.create({
                        data: {
                            paymentId: updatedPayment.id,
                            studentId: updatedPayment.studentId.toString(),
                            businessId: updatedPayment.businessId,
                            paymentType: paymentTypeStr,
                            status: 'Pending',
                            items: {
                                create: deliverableCourses
                            }
                        }
                    });
                    console.log(`🚚 Auto-Delivery created for PayHere Payment ID: ${order_id}`);
                }
            }
        }
        
        res.status(200).send("OK");
    } catch (error) {
        console.error("PayHere Notify Error:", error);
        res.status(500).send("Webhook Error");
    }
};

// 4. Enrollment
exports.enrollStudent = async (req, res) => {
    try {
        const studentId = req.user?.userId || req.user?.id;
        const { businessId, batchId, groupId, subjects, paymentMethodChosen, method, orderId, amount, remark, upgrades } = req.body;
        
        const slipFileNames = req.files && req.files.length > 0 
            ? req.files.map(f => f.filename).join(',') 
            : null;

        const safeMethod = String(method || '').toLowerCase().trim();
        const initialStatus = (safeMethod === 'payhere' || safeMethod === 'paycorp') ? 1 : 0;

        // 🔥 MULTI-BUSINESS UPGRADE HANDLING 🔥
        if (upgrades) {
            const parsedUpgrades = typeof upgrades === 'string' ? JSON.parse(upgrades) : upgrades;
            
            // 1. DUPLICATE PAYMENT PREVENTION LOGIC FOR ALL BATCHES
            if (safeMethod === 'slip') {
                const fiveMinutesAgo = new Date(Date.now() - 10 * 1000); // Changed to 10 seconds for testing
                for (const upg of parsedUpgrades) {
                    let parsedPaymentType = 1; 
                    if (upg.paymentMethodChosen) {
                        const methodStr = String(upg.paymentMethodChosen).toLowerCase().trim();
                        if (methodStr === 'installment' || methodStr === '2') {
                            parsedPaymentType = 2; 
                        } else if (methodStr === 'full' || methodStr === '3') {
                            parsedPaymentType = 3; 
                        }
                    }

                    const recentDuplicatePayment = await prisma.payment.findFirst({
                        where: {
                            studentId: parseInt(studentId),
                            businessId: parseInt(upg.businessId),
                            batchId: parseInt(upg.batchId),
                            method: 'Slip',
                            payment_type: parsedPaymentType,
                            status: { notIn: [2, 5] },
                            created_at: {
                                gte: fiveMinutesAgo
                            }
                        }
                    });

                    if (recentDuplicatePayment) {
                        console.log(`🚫 Duplicate slip upload blocked for Student: ${studentId}, Batch: ${upg.batchId}`);
                        return res.status(400).json({ 
                            error: "ඔබගේ ගෙවීම මේ වනවිටත් තහවුරු වෙමින් පවතී. කරුණාකර මඳ වේලාවක් රැඳී සිටින්න." 
                        });
                    }

                    // 🔥 PREVENT ENROLLING IN ALREADY PAID SUBJECTS 🔥
                    const existingPayments = await prisma.payment.findMany({
                        where: { studentId: parseInt(studentId), status: { in: [0, 1, 4] }, payment_type: { in: [2, 3] } }
                    });
                    let enrolledSubIds = [];
                    existingPayments.forEach(p => {
                        if (p.subjects) {
                            try { enrolledSubIds.push(...JSON.parse(p.subjects).map(Number)); } catch(e) {}
                        }
                    });
                    
                    if (upg.subjects && Array.isArray(upg.subjects)) {
                        const requestedSubIds = upg.subjects.map(Number);
                        const alreadyEnrolled = requestedSubIds.some(id => enrolledSubIds.includes(id));
                        if (alreadyEnrolled) {
                            console.log(`🚫 Prevented duplicate subject enrollment for Student: ${studentId}`);
                            return res.status(400).json({ 
                                error: "ඔබ මෙම විෂයන් සඳහා මේ වනවිටත් ගෙවීම් කර ඇත! (You have already paid for some of these subjects)" 
                            });
                        }
                    }
                }
            }

            const createdPayments = [];

            // 2. CREATE PAYMENT RECORD PER BATCH
            for (const upg of parsedUpgrades) {
                let parsedPaymentType = 1; 
                if (upg.paymentMethodChosen) {
                    const methodStr = String(upg.paymentMethodChosen).toLowerCase().trim();
                    if (methodStr === 'installment' || methodStr === '2') {
                        parsedPaymentType = 2; 
                    } else if (methodStr === 'full' || methodStr === '3') {
                        parsedPaymentType = 3; 
                    }
                }

                const finalRemark = upg.remark ? `${upg.remark} | Total Slip: LKR ${amount}${remark ? ` | Student Msg: ${remark}` : ''}` : remark || null;

                const newPayment = await prisma.payment.create({
                    data: {
                        studentId: parseInt(studentId),
                        businessId: parseInt(upg.businessId),
                        batchId: parseInt(upg.batchId),
                        groupId: upg.groupId ? parseInt(upg.groupId) : null,
                        subjects: JSON.stringify([...new Set((typeof upg.subjects === 'string' ? JSON.parse(upg.subjects) : (upg.subjects || [])))].map(String)),
                        payment_type: parsedPaymentType,
                        method: safeMethod === 'slip' ? 'Slip' : (safeMethod === 'paycorp' ? 'Paycorp' : 'PayHere'),
                        status: initialStatus,
                        slip_image: slipFileNames,
                        amount: upg.amount ? parseFloat(parseFloat(upg.amount).toFixed(2)) : 0,
                        remark: finalRemark
                    }
                });

                // PayHere/Paycorp Delivery Auto-Create Logic...
                if ((safeMethod === 'payhere' || safeMethod === 'paycorp') && newPayment.subjects) {
                    try {
                        if (newPayment.subjects) {
                            const subIds = JSON.parse(newPayment.subjects).map(id => parseInt(id));
                            const courses = await prisma.course.findMany({ where: { id: { in: subIds } } });

                            let existingDeliveredCourseIds = [];
                            if (parsedPaymentType === 1 && newPayment.groupId) {
                                const existingItems = await prisma.deliveryItem.findMany({
                                    where: { delivery: { studentId: newPayment.studentId.toString(), paymentType: 'Monthly', payment: { groupId: newPayment.groupId } } },
                                    select: { courseId: true }
                                });
                                existingDeliveredCourseIds = existingItems.map(i => i.courseId);
                            } else if ((parsedPaymentType === 2 || parsedPaymentType === 3) && newPayment.batchId) {
                                const existingItems = await prisma.deliveryItem.findMany({
                                    where: { delivery: { studentId: newPayment.studentId.toString(), paymentType: { in: ['Installment', 'Full'] }, payment: { batchId: newPayment.batchId } } },
                                    select: { courseId: true }
                                });
                                existingDeliveredCourseIds = existingItems.map(i => i.courseId);
                            }

                            const deliverableCoursesMap = new Map();
                            for (const course of courses) {
                                if (existingDeliveredCourseIds.includes(course.id)) continue;

                                
                                let deliverTute = false;
        let tuteName = course.name || "Tute";
        let tuteImage = null;
                                let parsedPType = parseInt(parsedPaymentType);

                                let currentGroupId = null;
                                if (typeof updatedPayment !== 'undefined' && updatedPayment.groupId) currentGroupId = updatedPayment.groupId;
                                else if (typeof newPayment !== 'undefined' && newPayment.groupId) currentGroupId = newPayment.groupId;
                                else if (typeof payRecord !== 'undefined' && payRecord.groupId) currentGroupId = payRecord.groupId;
                                
                                if (course.groupPrices && currentGroupId) {
                                    try {
                                        const gps = JSON.parse(course.groupPrices);
                                        const match = gps.find(g => g.groupId == currentGroupId);
                                        if (match && (match.deliverTute === true || match.deliverTute === 'true')) {
                                            deliverTute = true;
                                            if (match.tuteName) tuteName = match.tuteName;
                                            if (match.tuteCover) tuteImage = match.tuteCover;
                                        }
                                    } catch(e) {}
                                }
                                
                                if (deliverTute) {
                                    const key = `${course.id}_${tuteName}`;
                                    if (!deliverableCoursesMap.has(key)) {
                                        deliverableCoursesMap.set(key, { courseId: course.id, tuteName: tuteName, tuteImage: typeof tuteImage !== 'undefined' ? tuteImage : null, quantity: 1 });
                                    }
                                }

                            }
                            const deliverableCourses = Array.from(deliverableCoursesMap.values());

                            if (deliverableCourses.length > 0) {
                                const paymentTypeStr = parsedPaymentType === 1 ? 'Monthly' : (parsedPaymentType === 2 ? 'Installment' : 'Full');

                                await prisma.delivery.create({
                                    data: {
                                        paymentId: newPayment.id,
                                        studentId: newPayment.studentId.toString(),
                                        businessId: newPayment.businessId,
                                        paymentType: paymentTypeStr,
                                        status: 'Pending', 
                                        items: {
                                            create: deliverableCourses
                                        }
                                    }
                                });
                                console.log(`🚚 Auto-Delivery created for Instant PayHere Payment ID: ${newPayment.id}`);
                            }
                        }
                    } catch (err) {
                        console.error("Auto Delivery Error:", err);
                    }
                }

                // Lead Sync logic for card payments
                if (initialStatus === 1) {
                    try {
                        const { syncLeadEnrollment } = require('./paymentController');
                        await syncLeadEnrollment(parseInt(studentId), parsedPaymentType, newPayment);
                    } catch (e) {
                        console.error("CRM Sync Error:", e);
                    }
                }

                createdPayments.push(newPayment);
            }

            return res.status(200).json({ message: safeMethod === 'payhere' ? "Payments Approved & Enrolled" : "Enrolled Successfully", payments: createdPayments });
        }

        // ----------------------------------------------------
        // 🔥 STANDARD SINGLE BUSINESS ENROLLMENT/UPGRADE FLOW 🔥
        // ----------------------------------------------------
        let parsedPaymentType = 1; 
        
        if (paymentMethodChosen) {
            const methodStr = String(paymentMethodChosen).toLowerCase().trim();
            if (methodStr === 'installment' || methodStr === '2') {
                parsedPaymentType = 2; 
            } else if (methodStr === 'full' || methodStr === '3') {
                parsedPaymentType = 3; 
            } else if (methodStr === 'monthly' || methodStr === '1') {
                parsedPaymentType = 1; 
            }
        }

        if (groupId) {
            const groupData = await prisma.group.findUnique({ where: { id: parseInt(groupId) } });
            if (groupData) {
                const isUpgrade = remark && remark.includes('[UPGRADE]');
                if (!isUpgrade) {
                    if (groupData.type === 1) {
                        parsedPaymentType = 1; 
                    } else if (groupData.type === 2) {
                        if (parsedPaymentType === 1) {
                            parsedPaymentType = 3; 
                        }
                    }
                }
            }
        }

        // 🔥 DUPLICATE PAYMENT PREVENTION LOGIC (START) 🔥
        if (safeMethod === 'slip') {
            const fiveMinutesAgo = new Date(Date.now() - 10 * 1000); // Changed to 10 seconds for testing // විනාඩි 5කට කලින් වෙලාව
            
            const recentDuplicatePayment = await prisma.payment.findFirst({
                where: {
                    studentId: parseInt(studentId),
                    businessId: parseInt(businessId),
                    batchId: parseInt(batchId),
                    method: 'Slip',
                    payment_type: parsedPaymentType,
                    status: { notIn: [2, 5] },
                    created_at: {
                        gte: fiveMinutesAgo // පහුගිය විනාඩි 5 ඇතුළත දාලද බලනවා
                    }
                }
            });

            if (recentDuplicatePayment) {
                console.log(`🚫 Duplicate slip upload blocked for Student: ${studentId}, Batch: ${businessId}`);
                // ළමයා දෙපාරක් එබුවොත් Error එකක් යවනවා අලුත් එක සේව් කරන්නේ නැතුව
                return res.status(400).json({ 
                    error: "ඔබගේ ගෙවීම මේ වනවිටත් තහවුරු වෙමින් පවතී. කරුණාකර මඳ වේලාවක් රැඳී සිටින්න." 
                });
            }
        }
        // 🔥 DUPLICATE PAYMENT PREVENTION LOGIC (END) 🔥

        const newPayment = await prisma.payment.create({
            data: {
                studentId: parseInt(studentId),
                businessId: parseInt(businessId),
                batchId: parseInt(batchId),
                groupId: groupId ? parseInt(groupId) : null,
                subjects: JSON.stringify([...new Set((typeof subjects === 'string' ? JSON.parse(subjects) : (subjects || [])))].map(String)),
                payment_type: parsedPaymentType,
                method: safeMethod === 'slip' ? 'Slip' : (safeMethod === 'paycorp' ? 'Paycorp' : 'PayHere'),
                status: initialStatus,
                slip_image: slipFileNames,
                amount: amount ? parseFloat(parseFloat(amount).toFixed(2)) : 0,
                remark: remark || null 
            }
        });

        // PayHere/Paycorp Delivery Auto-Create Logic...
        if ((safeMethod === 'payhere' || safeMethod === 'paycorp') && newPayment.subjects) {
            try {
                if (newPayment.subjects) {
                    const subIds = JSON.parse(newPayment.subjects).map(id => parseInt(id));
                    const courses = await prisma.course.findMany({ where: { id: { in: subIds } } });

                    let existingDeliveredCourseIds = [];
                    if (parsedPaymentType === 1 && newPayment.groupId) {
                        const existingItems = await prisma.deliveryItem.findMany({
                            where: { delivery: { studentId: newPayment.studentId.toString(), paymentType: 'Monthly', payment: { groupId: newPayment.groupId } } },
                            select: { courseId: true }
                        });
                        existingDeliveredCourseIds = existingItems.map(i => i.courseId);
                    } else if ((parsedPaymentType === 2 || parsedPaymentType === 3) && newPayment.batchId) {
                        const existingItems = await prisma.deliveryItem.findMany({
                            where: { delivery: { studentId: newPayment.studentId.toString(), paymentType: { in: ['Installment', 'Full'] }, payment: { batchId: newPayment.batchId } } },
                            select: { courseId: true }
                        });
                        existingDeliveredCourseIds = existingItems.map(i => i.courseId);
                    }

                    const deliverableCoursesMap = new Map();
                    for (const course of courses) {
                        if (existingDeliveredCourseIds.includes(course.id)) continue;

                        
                                let deliverTute = false;
        let tuteName = course.name || "Tute";
        let tuteImage = null;
                                let parsedPType = parseInt(parsedPaymentType);

                                let currentGroupId = null;
                                if (typeof updatedPayment !== 'undefined' && updatedPayment.groupId) currentGroupId = updatedPayment.groupId;
                                else if (typeof newPayment !== 'undefined' && newPayment.groupId) currentGroupId = newPayment.groupId;
                                else if (typeof payRecord !== 'undefined' && payRecord.groupId) currentGroupId = payRecord.groupId;
                                
                                if (course.groupPrices && currentGroupId) {
                                    try {
                                        const gps = JSON.parse(course.groupPrices);
                                        const match = gps.find(g => g.groupId == currentGroupId);
                                        if (match && (match.deliverTute === true || match.deliverTute === 'true')) {
                                            deliverTute = true;
                                            if (match.tuteName) tuteName = match.tuteName;
                                            if (match.tuteCover) tuteImage = match.tuteCover;
                                        }
                                    } catch(e) {}
                                }
                                
                                if (deliverTute) {
                                    const key = `${course.id}_${tuteName}`;
                                    if (!deliverableCoursesMap.has(key)) {
                                        deliverableCoursesMap.set(key, { courseId: course.id, tuteName: tuteName, tuteImage: typeof tuteImage !== 'undefined' ? tuteImage : null, quantity: 1 });
                                    }
                                }

                    }
                    const deliverableCourses = Array.from(deliverableCoursesMap.values());

                    if (deliverableCourses.length > 0) {
                        const paymentTypeStr = parsedPaymentType === 1 ? 'Monthly' : (parsedPaymentType === 2 ? 'Installment' : 'Full');

                        await prisma.delivery.create({
                            data: {
                                paymentId: newPayment.id,
                                studentId: newPayment.studentId.toString(),
                                businessId: newPayment.businessId,
                                paymentType: paymentTypeStr,
                                status: 'Pending', 
                                items: {
                                    create: deliverableCourses
                                }
                            }
                        });
                        console.log(`🚚 Auto-Delivery created for Instant PayHere Payment ID: ${newPayment.id}`);
                    }
                }
            } catch (err) {
                console.error("Auto Delivery Error:", err);
            }
        }

        res.status(200).json({ message: safeMethod === 'payhere' ? "Payment Approved & Enrolled" : "Enrolled Successfully" });
    } catch (error) {
        console.error("Enrollment Save Error:", error);
        res.status(500).json({ error: "Enrollment failed" });
    }
};

// 5. My Classroom
exports.getStudentClassroom = async (req, res) => {
    try {
        const studentId = req.user?.userId || req.user?.id;

        const validPayments = await prisma.payment.findMany({
            where: { studentId: parseInt(studentId), status: { in: [1, 4] } }
        });

        if (validPayments.length === 0) return res.status(200).json({ businesses: [] });

        const validBatchIds = [...new Set(validPayments.map(p => p.batchId).filter(Boolean))];
        let validGroupIds = [...new Set(validPayments.map(p => p.groupId).filter(Boolean))];

        let allowedSubjectIds = [];
        validPayments.forEach(p => {
            if (p.subjects) {
                try {
                    const subs = JSON.parse(p.subjects);
                    allowedSubjectIds = [...allowedSubjectIds, ...subs.map(id => parseInt(id))];
                } catch (e) {}
            }
        });

        const businesses = await prisma.business.findMany({
            where: { batches: { some: { id: { in: validBatchIds } } } },
            include: {
                batches: {
                    where: { id: { in: validBatchIds } },
                    include: {
                        groups: {
                            where: validGroupIds.length > 0 ? { id: { in: validGroupIds } } : undefined,
                            include: { courses: true }
                        }
                    }
                }
            }
        });

        // 🔥 FIX: Map all allowed subjects to their codes AND names so we can match payments by code or name instead of just exact ID
        const paidCourses = await prisma.course.findMany({
            where: { id: { in: allowedSubjectIds } },
            select: { id: true, code: true, name: true }
        });
        const paidCourseMap = new Map();
        paidCourses.forEach(c => paidCourseMap.set(c.id, { code: c.code, name: c.name }));

        businesses.forEach(biz => {
            biz.batches.forEach(batch => {
                batch.groups.forEach(group => {
                    // Determine which subjects were explicitly paid for in THIS group
                    const paidSubjectIdsInThisGroup = [];
                    validPayments.filter(p => p.groupId === group.id).forEach(p => {
                        if (p.subjects && p.subjects !== '[]') {
                            try { paidSubjectIdsInThisGroup.push(...JSON.parse(p.subjects).map(Number)); } catch(e){}
                        }
                    });

                    // Get the paid courses details (for code/name matching) only for this group
                    const paidCoursesInThisGroup = paidCourses.filter(pc => paidSubjectIdsInThisGroup.includes(pc.id));

                    group.courses = group.courses.filter(c => {
                        const hasFullGroupPayment = validPayments.some(p => p.groupId === group.id && (!p.subjects || p.subjects === '[]'));
                        if (hasFullGroupPayment) return true;

                        if (allowedSubjectIds.includes(c.id)) return true;
                        
                        // Fallback: match by code/name ONLY against subjects paid for in THIS group
                        for (const paidCourse of paidCoursesInThisGroup) {
                            if (c.code && paidCourse.code === c.code) return true;
                            if (c.name && paidCourse.name === c.name) return true;
                        }
                        
                        return false;
                    });
                    // Determine actual payment type for the student for EACH course
                    group.courses.forEach(course => {
                        const courseCode = course.code;
                        const courseName = course.name;

                        const coursePayments = validPayments.filter(p => {
                            if (!p.subjects) return true;
                            try {
                                const subs = JSON.parse(p.subjects).map(id => parseInt(id));
                                // Check if exact ID matches, OR if the payment contains a subject with the same code or name
                                return subs.includes(course.id) || subs.some(subId => {
                                    const paidCourse = paidCourseMap.get(subId);
                                    if (!paidCourse) return false;
                                    if (courseCode && paidCourse.code === courseCode) return true;
                                    if (courseName && paidCourse.name === courseName) return true;
                                    return false;
                                });
                            } catch (e) {
                                return true;
                            }
                        });

                        let actualType = 1; // Default to Monthly
                        if (coursePayments.some(p => p.payment_type === 3)) {
                            actualType = 3;
                        } else if (coursePayments.some(p => p.payment_type === 2)) {
                            actualType = 2;
                        }
                        course.studentPaymentType = actualType;
                    });
                });
            });

        });

        const safeData = safeJson(businesses);
        res.status(200).json({ businesses: safeData }); 
    } catch (error) {
        console.error("Classroom Error:", error);
        res.status(500).json({ error: "Failed to load classroom" });
    }
};

// 6. Course Modules
exports.getCourseModules = async (req, res) => {
    try {
        const { id } = req.params; 
        const studentId = req.user?.userId || req.user?.id;

        const requestedCourse = await prisma.course.findUnique({
            where: { id: parseInt(id) },
            include: { group: true }
        });

        let targetCourseIds = [BigInt(id)];

        if (requestedCourse && requestedCourse.group?.batchId) {
            const batchId = requestedCourse.group.batchId;
            const fullPayments = await prisma.payment.findMany({
                where: {
                    studentId: parseInt(studentId),
                    batchId: batchId,
                    payment_type: { in: [2, 3] },
                    status: { in: [1, 4] }
                }
            });

            if (fullPayments.length > 0) {
                // If Full Payment, fetch all courses in this batch with the same code OR same name
                const similarCourses = await prisma.course.findMany({
                    where: {
                        OR: [
                            requestedCourse.code ? { code: requestedCourse.code } : undefined,
                            { name: requestedCourse.name }
                        ].filter(Boolean),
                        group: { batchId: batchId }
                    }
                });
                
                const similarCourseIds = similarCourses.map(c => parseInt(c.id));
                
                const validFullPayments = fullPayments.filter(p => {
                    if (!p.subjects) return true;
                    try {
                        const subs = JSON.parse(p.subjects).map(s => parseInt(s));
                        return subs.some(subId => similarCourseIds.includes(subId));
                    } catch (e) {
                        return true;
                    }
                });

                if (validFullPayments.length > 0) {
                    targetCourseIds = similarCourses.map(c => BigInt(c.id));
                }
            }
        }

        const linkedContents = await prisma.contentCourse.findMany({
            where: { course_id: { in: targetCourseIds } }
        });
        
        const contentIds = linkedContents.map(lc => lc.content_id);
        
        const contentsRaw = await prisma.content.findMany({
            where: { id: { in: contentIds } },
            include: { group: true },
            orderBy: { createdAt: 'desc' }
        });

        // 🔥 FIX: Deduplicate contents to prevent showing duplicates when enrolled in both Monthly and Full Payment courses
        const uniqueContentsMap = new Map();
        contentsRaw.forEach(c => {
            const uniqueKey = `${(c.title || '').trim().toLowerCase()}_${c.contentType}`;
            if (!uniqueContentsMap.has(uniqueKey)) {
                uniqueContentsMap.set(uniqueKey, c);
            }
        });
        const contents = Array.from(uniqueContentsMap.values());

        const groupIds = [...new Set(contents.map(c => c.contentGroupId).filter(Boolean))];
        const lessonGroups = await prisma.contentGroup.findMany({
             where: { id: { in: groupIds } },
             orderBy: { itemOrder: 'asc' }
        });

        const liveClasses = contents.filter(c => c.contentType === 'live' || c.contentType === '1');
        const recordings = contents.filter(c => c.contentType === 'recording' || c.contentType === '2');
        const documents = contents.filter(c => c.contentType === 'document' || c.contentType === '3');
        const sPapers = contents.filter(c => c.contentType === 'sPaper' || c.contentType === '4');
        const papers = contents.filter(c => c.contentType === 'paper' || c.contentType === '5');

        const safeData = safeJson({ 
            lessonGroups, 
            contents,
            liveClasses,
            recordings,
            documents,
            sPapers,
            papers,
            paidStatus: 1 
        });
        
        res.status(200).json(safeData);
    } catch (error) {
        console.error("Module Error:", error);
        res.status(500).json({ error: "Failed to load modules" });
    }
};

// 7. Payment History
exports.getMyPayments = async (req, res) => {
    try {
        const studentId = req.user?.userId || req.user?.id;
        console.log(`[getMyPayments] Called for Student ID: ${studentId}`);

        const payments = await prisma.payment.findMany({
            where: { 
                studentId: parseInt(studentId),
                OR: [
                    { status: { not: 5 } },
                    {
                        status: 5,
                        OR: [
                            { due_date: { not: null } },
                            { method: 'Upcoming' }
                        ]
                    }
                ]
            },
            include: { business: true, batch: true, group: true },
            orderBy: { created_at: 'desc' }
        });

        const studentData = await prisma.user.findUnique({ 
            where: { id: parseInt(studentId) }, 
            select: { walletBalance: true } 
        });

        const formattedPayments = payments.map(p => {
            let frontendStatus = p.status;
            if (p.status === 0 && p.method === 'Slip') frontendStatus = -1; 
            else if (p.status === 0 && p.method === 'Upcoming') frontendStatus = 0; 

            return {
                id: p.id,
                businessId: p.businessId || p.business?.id || p.batch?.businessId,
                courseName: `${p.business?.name || 'Course'} - ${p.batch?.name || 'Batch'} - ${p.group?.name || 'Unknown'}`,
                groupName: p.group?.name,
                slips: p.slip_image ? p.slip_image.split(',') : [],
                amount: p.amount || 0, 
                status: frontendStatus,
                createdDate: p.created_at,
                dueDate: p.due_date,
                isInstallment: p.payment_type === 2,
                installmentNo: p.installment_no,
                method: p.method,
                excessAmount: p.excessAmount || 0,  
                arrearsAmount: p.arrearsAmount || 0 
            };
        });

        // -- PROACTIVE UPCOMING MONTHLY PAYMENTS LOGIC FOR MY PAYMENTS --
        const today = new Date();
        if (today.getDate() >= 24 || today.getDate() <= 15) {
            const validMonthly = await prisma.payment.findMany({
                where: { studentId: parseInt(studentId), status: { in: [0, 1, 4] }, payment_type: 1 },
                include: { group: true, batch: { include: { business: true } } }
            });
            
            const batchMap = {};
            validMonthly.forEach(p => {
                if (!p.batchId || !p.group) return;
                if (!batchMap[p.batchId]) {
                    batchMap[p.batchId] = { batch: p.batch, highestGroup: p.group, subjects: p.subjects };
                } else {
                    if (p.group.itemOrder > batchMap[p.batchId].highestGroup.itemOrder) {
                        batchMap[p.batchId].highestGroup = p.group;
                        batchMap[p.batchId].subjects = p.subjects;
                    }
                }
            });

            for (let batchId in batchMap) {
                const { batch, highestGroup, subjects } = batchMap[batchId];
                
                const nextGroup = await prisma.group.findFirst({
                    where: {
                        batchId: parseInt(batchId),
                        type: 1, 
                        itemOrder: { gt: highestGroup.itemOrder }
                    },
                    orderBy: { itemOrder: 'asc' }
                });

                if (nextGroup) {
                    const existingPayment = await prisma.payment.findFirst({
                        where: {
                            studentId: parseInt(studentId),
                            batchId: parseInt(batchId),
                            groupId: nextGroup.id,
                            status: { not: 3 }
                        }
                    });

                    if (!existingPayment) {
                        let amount = 0;
                        let parsedSubjects = [];
                        try { parsedSubjects = subjects ? JSON.parse(subjects) : []; } catch(e) {}
                        
                        if (parsedSubjects.length > 0) {
                            const courseIds = parsedSubjects.map(id => parseInt(id));
                            const courses = await prisma.course.findMany({
                                where: { id: { in: courseIds } }
                            });
                            courses.forEach(c => {
                                let cPrice = c.price || 0;
                                if (c.groupPrices) {
                                    try {
                                        const gp = JSON.parse(c.groupPrices);
                                        if (gp[nextGroup.id]) cPrice = Number(gp[nextGroup.id]);
                                    } catch(e) {}
                                }
                                amount += cPrice;
                            });
                        }

                        const nextMonthDueDate = new Date(today.getFullYear(), today.getMonth() + 1, 5);
                        
                        // Push into formattedPayments
                        formattedPayments.push({
                            id: `virtual_${nextGroup.id}`,
                            courseName: `${batch.business?.name || 'Course'} - ${batch.name || 'Batch'} - ${nextGroup.name}`,
                            groupName: nextGroup.name,
                            groupId: nextGroup.id,
                            batchId: batch.id,
                            businessId: batch.businessId,
                            subjects: subjects,
                            slips: [],
                            amount: amount, 
                            status: 0, // Pending/Due
                            createdDate: nextMonthDueDate,
                            dueDate: nextMonthDueDate,
                            isInstallment: false,
                            method: 'Upcoming',
                            isUpcomingMonthly: true
                        });
                    }
                }
            }
        }
        // ------------------------------------------------

        const safeData = safeJson({
            oldPayments: formattedPayments,
            walletBalance: studentData?.walletBalance || 0
        });
        
        res.status(200).json(safeData); 
    } catch (error) {
        console.error("History Error:", error);
        res.status(200).json({ oldPayments: [], walletBalance: 0 }); 
    }
};

// 8. Profile
exports.updateProfile = async (req, res) => {
    try {
        const rawId = req.user?.userId || req.user?.id || req.userId || req.user;
        const studentId = parseInt(rawId);

        if (!studentId || isNaN(studentId)) {
            return res.status(401).json({ error: "User authorization failed. Please relogin." });
        }

        const { addressHouseNo, addressStreet, city, district } = req.body;
        const image = req.file ? req.file.filename : undefined;

        let updateData = { addressHouseNo, addressStreet, city, district };
        if (image) { updateData.image = image; }

        await prisma.user.update({
            where: { id: studentId },
            data: updateData
        });

        res.status(200).json({ message: "Profile updated successfully", image: image || null });
    } catch (error) {
        console.error("Profile Update Error:", error);
        res.status(500).json({ error: "Failed to update profile" });
    }
};

exports.updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.userId;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ error: "User not found" });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(401).json({ error: "Incorrect current password" });

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: userId },
            data: { 
                password: hashedPassword,
                session_id: crypto.randomBytes(16).toString('hex')
            }
        });

        res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
        console.error("Password Update Error:", error);
        res.status(500).json({ error: "Failed to update password" });
    }
};

// 🔥 NEW: Handle Due Slip Uploads / Online Pay For Dues
exports.uploadDueSlip = async (req, res) => {
    try {
        const { paymentId, remark, method, isVirtual, businessId, batchId, groupId, amount, subjects } = req.body;
        const safeMethod = String(method || '').toLowerCase().trim();

        if (!paymentId) {
            return res.status(400).json({ error: "Invalid or missing paymentId" });
        }

        const slipFileNames = req.files && req.files.length > 0 
            ? req.files.map(f => f.filename).join(',') 
            : null;

        if (safeMethod !== 'payhere' && !slipFileNames) {
            return res.status(400).json({ error: "No slips provided" });
        }

        let updatedPayment;

        if (isVirtual === 'true' || String(paymentId).startsWith('virtual_')) {
            const rawStudentId = req.user?.userId || req.user?.id;
            if (!rawStudentId) return res.status(401).json({ error: "Unauthorized" });

            updatedPayment = await prisma.payment.create({
                data: {
                    studentId: parseInt(rawStudentId),
                    businessId: parseInt(businessId),
                    batchId: parseInt(batchId),
                    groupId: parseInt(groupId),
                    amount: parseFloat(amount),
                    subjects: subjects || '[]',
                    payment_type: 1, // Monthly
                    status: safeMethod === 'payhere' ? 1 : 0,
                    method: safeMethod === 'payhere' ? 'PayHere' : 'Slip',
                    slip_image: slipFileNames,
                    remark: remark || null,
                    due_date: null
                }
            });
        } else {
            if (isNaN(parseInt(paymentId))) {
                return res.status(400).json({ error: "Invalid paymentId format" });
            }

            const existingPayment = await prisma.payment.findUnique({
                where: { id: parseInt(paymentId) }
            });

            if (!existingPayment) {
                return res.status(404).json({ error: "Payment record not found" });
            }

            if (existingPayment.status === 1 || existingPayment.status === 3) {
                return res.status(400).json({ error: "මෙම ගෙවීම දැනටමත් සිදුකර ඇත. නැවත රිසිට්පත් උඩුගත කළ නොහැක." });
            }

            updatedPayment = await prisma.payment.update({
                where: { id: parseInt(paymentId) },
                data: {
                    slip_image: slipFileNames || existingPayment.slip_image,
                    method: safeMethod === 'payhere' ? 'PayHere' : 'Slip',
                    status: safeMethod === 'payhere' ? 1 : 0, 
                    remark: remark ? (existingPayment.remark ? `${existingPayment.remark}\n${remark}` : remark) : existingPayment.remark
                }
            });
        }

        // PayHere Delivery & CRM Auto-Create Logic
        if (safeMethod === 'payhere' && updatedPayment.subjects) {
            try {
                const parsedPaymentType = updatedPayment.payment_type;
                const subIds = JSON.parse(updatedPayment.subjects).map(id => parseInt(id));
                const courses = await prisma.course.findMany({ where: { id: { in: subIds } } });

                let existingDeliveredCourseIds = [];
                if (parsedPaymentType === 1 && updatedPayment.groupId) {
                    const existingItems = await prisma.deliveryItem.findMany({
                        where: { delivery: { studentId: updatedPayment.studentId.toString(), paymentType: 'Monthly', payment: { groupId: updatedPayment.groupId } } },
                        select: { courseId: true }
                    });
                    existingDeliveredCourseIds = existingItems.map(i => i.courseId);
                } else if ((parsedPaymentType === 2 || parsedPaymentType === 3) && updatedPayment.batchId) {
                    const existingItems = await prisma.deliveryItem.findMany({
                        where: { delivery: { studentId: updatedPayment.studentId.toString(), paymentType: { in: ['Installment', 'Full'] }, payment: { batchId: updatedPayment.batchId } } },
                        select: { courseId: true }
                    });
                    existingDeliveredCourseIds = existingItems.map(i => i.courseId);
                }

                const deliverableCoursesMap = new Map();
                for (const course of courses) {
                    if (existingDeliveredCourseIds.includes(course.id)) continue;

                    
                                let deliverTute = false;
        let tuteName = course.name || "Tute";
        let tuteImage = null;
                                let parsedPType = parseInt(updatedPayment.payment_type);

                                let currentGroupId = null;
                                if (typeof updatedPayment !== 'undefined' && updatedPayment.groupId) currentGroupId = updatedPayment.groupId;
                                else if (typeof newPayment !== 'undefined' && newPayment.groupId) currentGroupId = newPayment.groupId;
                                else if (typeof payRecord !== 'undefined' && payRecord.groupId) currentGroupId = payRecord.groupId;
                                
                                if (course.groupPrices && currentGroupId) {
                                    try {
                                        const gps = JSON.parse(course.groupPrices);
                                        const match = gps.find(g => g.groupId == currentGroupId);
                                        if (match && (match.deliverTute === true || match.deliverTute === 'true')) {
                                            deliverTute = true;
                                            if (match.tuteName) tuteName = match.tuteName;
                                            if (match.tuteCover) tuteImage = match.tuteCover;
                                        }
                                    } catch(e) {}
                                }
                                
                                if (deliverTute) {
                                    const key = `${course.id}_${tuteName}`;
                                    if (!deliverableCoursesMap.has(key)) {
                                        deliverableCoursesMap.set(key, { courseId: course.id, tuteName: tuteName, tuteImage: typeof tuteImage !== 'undefined' ? tuteImage : null, quantity: 1 });
                                    }
                                }

                }
                const deliverableCourses = Array.from(deliverableCoursesMap.values());

                if (deliverableCourses.length > 0) {
                    const paymentTypeStr = parsedPaymentType === 1 ? 'Monthly' : (parsedPaymentType === 2 ? 'Installment' : 'Full');

                    await prisma.delivery.create({
                        data: {
                            paymentId: updatedPayment.id,
                            studentId: updatedPayment.studentId.toString(),
                            businessId: updatedPayment.businessId,
                            paymentType: paymentTypeStr,
                            status: 'Pending', 
                            items: { create: deliverableCourses }
                        }
                    });
                    console.log(`🚚 Auto-Delivery created for Online Due Payment ID: ${updatedPayment.id}`);
                }
            } catch (err) {
                console.error("Auto Delivery Error for due payment:", err);
            }

            try {
                const { syncLeadEnrollment } = require('./paymentController');
                await syncLeadEnrollment(parseInt(updatedPayment.studentId), updatedPayment.payment_type, updatedPayment);
            } catch (e) {
                console.error("CRM Sync Error for due payment:", e);
            }
        }

        res.status(200).json({ message: safeMethod === 'payhere' ? "Payment updated successfully" : "Slip uploaded successfully" });
    } catch (error) {
        console.error("Upload Due Slip Error:", error);
        res.status(500).json({ error: "Failed to upload slip" });
    }
};

// ==========================================
// 🔥 STUDENT DATA CENTER (ADMIN/STAFF USE) 🔥
// ==========================================

exports.getStudentsDataCenter = async (req, res) => {
    try {
        const students = await prisma.user.findMany({
            where: {
                role: {
                    in: ['Student', 'STUDENT', 'user', 'USER']
                }
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                whatsapp: true,
                optionalPhone: true,
                nic: true,
                addressHouseNo: true,
                addressStreet: true,
                city: true,
                district: true,
                image: true,
                role: true,
                payments: {
                    where: { status: { in: [1, 4] } },
                    include: {
                        business: true,
                        batch: true
                    }
                }
            },
            orderBy: { id: 'desc' }
        });

        const allCourses = await prisma.course.findMany({ select: { id: true, name: true } });
        const courseMap = {};
        allCourses.forEach(c => {
            courseMap[c.id] = c.name;
        });

        const formattedStudents = students.map(student => {
            const enrolledBusinesses = new Set();
            const enrolledBatches = new Set();
            const enrolledSubjects = new Set();

            student.payments.forEach(p => {
                if (p.business) enrolledBusinesses.add(p.business.name);
                if (p.batch) enrolledBatches.add(p.batch.name);
                if (p.subjects) {
                    try {
                        const parsed = JSON.parse(p.subjects);
                        parsed.forEach(sub => {
                            const subId = parseInt(sub.id || sub);
                            if (courseMap[subId]) {
                                enrolledSubjects.add(courseMap[subId]);
                            }
                        });
                    } catch(e) {}
                }
            });

            delete student.payments;

            return {
                ...student,
                enrolledBusinesses: Array.from(enrolledBusinesses),
                enrolledBatches: Array.from(enrolledBatches),
                enrolledSubjects: Array.from(enrolledSubjects)
            };
        });

        res.status(200).json(safeJson(formattedStudents));
    } catch (error) {
        console.error("Error fetching students data center:", error);
        res.status(500).json({ error: "Failed to fetch students" });
    }
};

const normalizePhone = (p) => {
    if (!p) return p;
    let num = String(p).replace(/[\s-]/g, '');
    if (num.startsWith('+94')) {
        num = '0' + num.slice(3);
    } else if (num.startsWith('94') && num.length === 11) {
        num = '0' + num.slice(2);
    }
    return num;
};

exports.updateStudentByAdmin = async (req, res) => {
    try {
        let { 
            id, firstName, lastName, phone, whatsapp, optionalPhone, 
            nic, addressHouseNo, addressStreet, city, district 
        } = req.body;

        phone = normalizePhone(phone);
        whatsapp = normalizePhone(whatsapp);
        optionalPhone = normalizePhone(optionalPhone);

        await prisma.user.update({
            where: { id: parseInt(id) },
            data: { 
                firstName, lastName, phone, whatsapp, optionalPhone, 
                nic, addressHouseNo, addressStreet, city, district 
            }
        });
        res.status(200).json({ message: "Student updated successfully" });
    } catch (error) {
        console.error("Update student error:", error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: "Phone number or NIC already exists for another student." });
        }
        res.status(500).json({ error: "Failed to update student" });
    }
};

exports.resetStudentPassword = async (req, res) => {
    try {
        const { studentId, newPassword } = req.body;
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        await prisma.user.update({
            where: { id: parseInt(studentId) },
            data: { 
                password: hashedPassword,
                session_id: crypto.randomBytes(16).toString('hex')
            }
        });
        
        res.status(200).json({ message: "Password reset successful" });
    } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ error: "Failed to reset password" });
    }
};

exports.ghostLogin = async (req, res) => {
    try {
        const { studentId } = req.body;
        const user = await prisma.user.findUnique({ where: { id: parseInt(studentId) } });
        
        if (!user) return res.status(404).json({ error: "Student not found" });

        const sessionId = crypto.randomBytes(16).toString('hex');
        await prisma.user.update({
            where: { id: user.id },
            data: { session_id: sessionId }
        });

        const token = jwt.sign(
            { id: user.id, userId: user.id, role: user.role, sessionId: sessionId },
            process.env.JWT_SECRET || "ima_super_secret_token_12345", 
            { expiresIn: '1d' }
        );

        delete user.password;

        res.status(200).json(safeJson({ token, user }));
    } catch (error) {
        console.error("Ghost login error:", error);
        res.status(500).json({ error: "Failed to ghost login" });
    }
};

// ==========================================
// 🚚 STUDENT DELIVERY MODULE 
// ==========================================

exports.getMyDeliveries = async (req, res) => {
    try {
        const studentId = req.user?.userId || req.user?.id;

        if (!studentId) {
            return res.status(401).json({ error: "Unauthorized access" });
        }

        const deliveries = await prisma.delivery.findMany({
            where: { studentId: studentId.toString() },
            include: { items: true },
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json(safeJson(deliveries));
    } catch (error) {
        console.error("Fetch Deliveries Error:", error);
        res.status(500).json({ error: "Failed to fetch deliveries." });
    }
};

exports.confirmDelivery = async (req, res) => {
    try {
        const { deliveryId, status } = req.body;
        const studentId = req.user?.userId || req.user?.id;

        if (!studentId) {
            return res.status(401).json({ error: "Unauthorized access" });
        }

        const existingDelivery = await prisma.delivery.findFirst({
            where: { id: parseInt(deliveryId), studentId: studentId.toString() }
        });

        if (!existingDelivery || existingDelivery.status !== 'On the way') {
            return res.status(400).json({ error: "Invalid request or delivery is not 'On the way'." });
        }

        const updatedDelivery = await prisma.delivery.update({
            where: { id: parseInt(deliveryId) },
            data: { 
                status: status, 
                resolvedAt: new Date()
            }
        });

        res.status(200).json({ message: `Delivery marked as ${status}`, data: safeJson(updatedDelivery) });
    } catch (error) {
        console.error("Confirm Delivery Error:", error);
        res.status(500).json({ error: "Failed to update delivery status." });
    }
};

const youtubedl = require('yt-dlp-exec');
const path = require('path');
const fs = require('fs');

// 🔥 PERMANENT YOUTUBE DIRECT STREAM FIX (YT-DLP WITH COOKIES) 🔥
exports.getVideoStream = async (req, res) => {
    try {
        const videoId = req.params.videoId;
        
        console.log(`🎬 YouTube Secure Stream request for ID: ${videoId}`);

        if (!videoId) {
            return res.status(400).json({ error: 'Invalid YouTube ID' });
        }

        const cookiePath = path.join(__dirname, '..', 'yt_cookies.txt');
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

        const options = {
            dumpSingleJson: true,
            noWarnings: true,
            noCallHome: true,
            noCheckCertificate: true,
            youtubeSkipDashManifest: true,
            format: 'best'
        };

        if (fs.existsSync(cookiePath)) {
            options.cookies = cookiePath;
        }

        // Fetch direct video URL using yt-dlp
        const output = await youtubedl(videoUrl, options);

        if (!output || !output.url) {
            throw new Error("Could not extract video URL");
        }

        res.status(200).json({ 
            stream_url: output.url,
            is_youtube_embed: false, 
            yt_id: videoId
        });

    } catch (error) {
        console.error("❌ yt-dlp Error (Falling back to iframe):", error.message);
        const embedUrl = `https://www.youtube.com/embed/${req.params.videoId}?rel=0&modestbranding=1`;
        res.status(200).json({ 
            stream_url: embedUrl,
            is_youtube_embed: true, 
            yt_id: req.params.videoId
        });
    }
};

// 🔥 NEW: Delete Student Account (Safe Delete with Relations & Debugging) 🔥

// 🔥 FIXED: Pay Due Online
exports.payDueOnline = async (req, res) => {
    try {
        const { paymentId, orderId, method, isVirtual, businessId, batchId, groupId, amount, subjects } = req.body;
        const rawStudentId = req.user?.userId || req.user?.id;

        if (!rawStudentId) return res.status(401).json({ error: "Unauthorized" });
        const studentId = parseInt(rawStudentId);

        const safeMethod = method === 'payhere' || method === 'PayHere' ? 'PayHere' : 'Paycorp';

        let updatedPayment;

        if (isVirtual === 'true' || String(paymentId).startsWith('virtual_')) {
            updatedPayment = await prisma.payment.create({
                data: {
                    studentId: studentId,
                    businessId: parseInt(businessId),
                    batchId: parseInt(batchId),
                    groupId: parseInt(groupId),
                    amount: parseFloat(amount),
                    subjects: subjects || '[]',
                    payment_type: 1, // Monthly
                    status: 1, // Approved
                    method: safeMethod,
                    remark: `Sampath IPG ID: ${orderId || 'Direct'}`,
                    due_date: null
                }
            });
        } else {
            const payment = await prisma.payment.findFirst({
                where: { id: parseInt(paymentId), studentId: studentId }
            });

            if (!payment) return res.status(404).json({ error: "Payment not found" });

            // update the payment as paid via Paycorp / Sampath IPG
            updatedPayment = await prisma.payment.update({
                where: { id: parseInt(paymentId) },
                data: {
                    status: 1,
                    method: safeMethod,
                    remark: payment.remark ? `${payment.remark} | Sampath IPG ID: ${orderId || 'Direct'}` : `Sampath IPG ID: ${orderId || 'Direct'}`
                }
            });
        }

        // 🔥 Auto-Delivery Creation for Online Due Payment
        if (updatedPayment.subjects) {
            try {
                const parsedPaymentType = updatedPayment.payment_type;
                const subIds = JSON.parse(updatedPayment.subjects).map(id => parseInt(id));
                const courses = await prisma.course.findMany({ where: { id: { in: subIds } } });

                let existingDeliveredCourseIds = [];
                if (parsedPaymentType === 1 && updatedPayment.groupId) {
                    const existingItems = await prisma.deliveryItem.findMany({
                        where: { delivery: { studentId: updatedPayment.studentId.toString(), paymentType: 'Monthly', payment: { groupId: updatedPayment.groupId } } },
                        select: { courseId: true }
                    });
                    existingDeliveredCourseIds = existingItems.map(i => i.courseId);
                } else if ((parsedPaymentType === 2 || parsedPaymentType === 3) && updatedPayment.batchId) {
                    const existingItems = await prisma.deliveryItem.findMany({
                        where: { delivery: { studentId: updatedPayment.studentId.toString(), paymentType: { in: ['Installment', 'Full'] }, payment: { batchId: updatedPayment.batchId } } },
                        select: { courseId: true }
                    });
                    existingDeliveredCourseIds = existingItems.map(i => i.courseId);
                }

                const deliverableCoursesMap = new Map();
                for (const course of courses) {
                    if (existingDeliveredCourseIds.includes(course.id)) continue;

                    let deliverTute = false;
        let tuteName = course.name || "Tute";
        let tuteImage = null;
                    let parsedPType = parseInt(updatedPayment.payment_type);

                        let currentGroupId = updatedPayment.groupId;
                        if (course.groupPrices && currentGroupId) {
                            try {
                                const gps = JSON.parse(course.groupPrices);
                                const match = gps.find(g => g.groupId == currentGroupId);
                                if (match && (match.deliverTute === true || match.deliverTute === 'true')) {
                                    deliverTute = true;
                                    if (match.tuteName) tuteName = match.tuteName;
                                    if (match.tuteCover) tuteImage = match.tuteCover;
                                }
                            } catch(e) {}
                        }
                        
                        if (deliverTute) {
                            const key = `${course.id}_${tuteName}`;
                            if (!deliverableCoursesMap.has(key)) {
                                deliverableCoursesMap.set(key, { courseId: course.id, tuteName: tuteName, tuteImage: typeof tuteImage !== 'undefined' ? tuteImage : null, quantity: 1 });
                            }
                        }
                }
                const deliverableCourses = Array.from(deliverableCoursesMap.values());

                if (deliverableCourses.length > 0) {
                    const paymentTypeStr = parsedPaymentType === 1 ? 'Monthly' : (parsedPaymentType === 2 ? 'Installment' : 'Full');

                    await prisma.delivery.create({
                        data: {
                            paymentId: updatedPayment.id,
                            studentId: updatedPayment.studentId.toString(),
                            businessId: updatedPayment.businessId,
                            paymentType: paymentTypeStr,
                            status: 'Pending', 
                            items: { create: deliverableCourses }
                        }
                    });
                    console.log(`🚚 Auto-Delivery created for Online Due Payment ID: ${updatedPayment.id}`);
                }
            } catch (err) {
                console.error("Auto Delivery Error for due payment:", err);
            }
        }

        // 🔥 Sync Lead Enrollment Status with CRM
        try {
            const { syncLeadEnrollment } = require('./paymentController');
            await syncLeadEnrollment(updatedPayment.studentId, updatedPayment.payment_type, updatedPayment);
        } catch (syncErr) {
            console.error("Lead Sync Error on Online Pay:", syncErr);
        }

        res.status(200).json({ message: "Payment updated successfully" });
    } catch (error) {
        console.error("Pay Due Online Error:", error);
        res.status(500).json({ error: "Failed to update payment" });
    }
};

exports.deleteStudentAccount = async (req, res) => {
    console.log("🔥 [BACKEND] Delete Student API Hit! Received Body:", req.body);
    try {
        const { studentId } = req.body;
        if (!studentId) {
            console.log("❌ [BACKEND] Error: No Student ID provided!");
            return res.status(400).json({ error: "Student ID is required." });
        }

        const id = parseInt(studentId);
        console.log(`🗑️ [BACKEND] Processing delete for ID: ${id}`);

        // 1. ළමයාගේ Payments සහ Deliveries අයින් කිරීම
        const payments = await prisma.payment.findMany({ where: { studentId: id } });
        if (payments.length > 0) {
            console.log(`📦 [BACKEND] Found ${payments.length} payments. Deleting related deliveries & payments...`);
            const paymentIds = payments.map(p => p.id);
            await prisma.delivery.deleteMany({ where: { paymentId: { in: paymentIds } } });
            await prisma.payment.deleteMany({ where: { studentId: id } });
        }

        // 2. ළමයා යවපු Chat Messages වල senderId එක null කිරීම
        console.log(`💬 [BACKEND] Clearing chat messages sender IDs...`);
        await prisma.chatMessage.updateMany({ 
            where: { senderId: id }, 
            data: { senderId: null } 
        });

        // 3. ආරක්ෂිතව ළමයාව Delete කිරීම
        console.log(`👤 [BACKEND] Deleting User Record from DB...`);
        await prisma.user.delete({ 
            where: { id } 
        });

        console.log("✅ [BACKEND] Student account permanently deleted.");
        res.status(200).json({ message: "Student account permanently deleted." });
    } catch (error) {
        console.error("❌ [BACKEND] Delete Student Error in Catch Block:", error);
        res.status(500).json({ error: "Failed to delete student account. Please check relations." });
    }
};