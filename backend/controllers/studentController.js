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
        let upcomingLive = null; 

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

                if (liveClasses.length > 0) {
                    const nearestClass = liveClasses[0]; 
                    
                    const courseLink = linkedContents.find(lc => lc.content_id === nearestClass.id);
                    const courseDetails = courseLink ? await prisma.course.findUnique({ where: { id: Number(courseLink.course_id) } }) : null;

                    upcomingLive = {
                        id: nearestClass.id,
                        title: nearestClass.title,
                        link: nearestClass.link,
                        date: nearestClass.date,
                        startTime: nearestClass.startTime,
                        endTime: nearestClass.endTime,
                        courseName: courseDetails?.name || 'Live Class'
                    };
                }
            }
        }

        res.status(200).json(safeJson({
            enrolledCount: enrolledSubjectIds.size, 
            upcomingLive: upcomingLive, 
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
            where: { studentId: parseInt(studentId), status: { in: [0, 1, 4] } } 
        });

        let enrolled = [];
        validPayments.forEach(p => {
            if (p.subjects) {
                try { 
                    const parsed = JSON.parse(p.subjects);
                    enrolled.push(...parsed.map(Number)); 
                    enrolled.push(...parsed.map(String)); 
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
            walletBalance: user?.walletBalance || 0
        });
    } catch (error) {
        res.status(500).json({ enrolledSubjects: [], walletBalance: 0 });
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

            let shouldCreateDelivery = true;
            if (updatedPayment.payment_type === 1) {
                if (updatedPayment.groupId) {
                    const ext = await prisma.delivery.findFirst({
                        where: { studentId: updatedPayment.studentId.toString(), paymentType: 'Monthly', payment: { groupId: updatedPayment.groupId } }
                    });
                    if (ext) shouldCreateDelivery = false;
                }
            } else if (updatedPayment.payment_type === 2 || updatedPayment.payment_type === 3) {
                if (updatedPayment.batchId) {
                    const ext = await prisma.delivery.findFirst({
                        where: { studentId: updatedPayment.studentId.toString(), paymentType: { in: ['Installment', 'Full'] }, payment: { batchId: updatedPayment.batchId } }
                    });
                    if (ext) shouldCreateDelivery = false;
                }
            }

            if (shouldCreateDelivery && updatedPayment.subjects) {
                const subIds = JSON.parse(updatedPayment.subjects).map(id => parseInt(id));
                const courses = await prisma.course.findMany({ where: { id: { in: subIds } } });

                if (courses.length > 0) {
                    const paymentTypeStr = parseInt(updatedPayment.payment_type) === 1 ? 'Monthly' : (parseInt(updatedPayment.payment_type) === 2 ? 'Installment' : 'Full');

                    await prisma.delivery.create({
                        data: {
                            paymentId: updatedPayment.id,
                            studentId: updatedPayment.studentId.toString(),
                            businessId: updatedPayment.businessId,
                            paymentType: paymentTypeStr,
                            status: 'Pending',
                            items: {
                                create: courses.map(c => ({
                                    courseId: c.id,
                                    tuteName: c.name || "Tute", 
                                    quantity: 1
                                }))
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
        const initialStatus = safeMethod === 'payhere' ? 1 : 0;

        // 🔥 MULTI-BUSINESS UPGRADE HANDLING 🔥
        if (upgrades) {
            const parsedUpgrades = typeof upgrades === 'string' ? JSON.parse(upgrades) : upgrades;
            
            // 1. DUPLICATE PAYMENT PREVENTION LOGIC FOR ALL BATCHES
            if (safeMethod === 'slip') {
                const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
                for (const upg of parsedUpgrades) {
                    const recentDuplicatePayment = await prisma.payment.findFirst({
                        where: {
                            studentId: parseInt(studentId),
                            businessId: parseInt(upg.businessId),
                            batchId: parseInt(upg.batchId),
                            method: 'Slip',
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
                        where: { studentId: parseInt(studentId), status: { in: [0, 1, 4] } }
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
                        subjects: typeof upg.subjects === 'string' ? upg.subjects : JSON.stringify(upg.subjects || []),
                        payment_type: parsedPaymentType,
                        method: safeMethod === 'slip' ? 'Slip' : 'PayHere',
                        status: initialStatus,
                        slip_image: slipFileNames,
                        amount: upg.amount ? parseFloat(parseFloat(upg.amount).toFixed(2)) : 0,
                        remark: finalRemark
                    }
                });

                // PayHere Delivery Auto-Create Logic...
                if (safeMethod === 'payhere' && newPayment.subjects) {
                    try {
                        let shouldCreateDelivery = true;
                        if (parsedPaymentType === 1) {
                            if (newPayment.groupId) {
                                const ext = await prisma.delivery.findFirst({
                                    where: { studentId: newPayment.studentId.toString(), paymentType: 'Monthly', payment: { groupId: newPayment.groupId } }
                                });
                                if (ext) shouldCreateDelivery = false;
                            }
                        } else if (parsedPaymentType === 2 || parsedPaymentType === 3) {
                            if (newPayment.batchId) {
                                const ext = await prisma.delivery.findFirst({
                                    where: { studentId: newPayment.studentId.toString(), paymentType: { in: ['Installment', 'Full'] }, payment: { batchId: newPayment.batchId } }
                                });
                                if (ext) shouldCreateDelivery = false;
                            }
                        }

                        if (shouldCreateDelivery) {
                            const subIds = JSON.parse(newPayment.subjects).map(id => parseInt(id));
                            const courses = await prisma.course.findMany({ where: { id: { in: subIds } } });

                            if (courses.length > 0) {
                                const paymentTypeStr = parsedPaymentType === 1 ? 'Monthly' : (parsedPaymentType === 2 ? 'Installment' : 'Full');

                                await prisma.delivery.create({
                                    data: {
                                        paymentId: newPayment.id,
                                        studentId: newPayment.studentId.toString(),
                                        businessId: newPayment.businessId,
                                        paymentType: paymentTypeStr,
                                        status: 'Pending', 
                                        items: {
                                            create: courses.map(c => ({
                                                courseId: c.id,
                                                tuteName: c.name || "Tute",
                                                quantity: 1
                                            }))
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
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000); // විනාඩි 5කට කලින් වෙලාව
            
            const recentDuplicatePayment = await prisma.payment.findFirst({
                where: {
                    studentId: parseInt(studentId),
                    businessId: parseInt(businessId),
                    batchId: parseInt(batchId),
                    method: 'Slip',
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
                subjects: typeof subjects === 'string' ? subjects : JSON.stringify(subjects || []),
                payment_type: parsedPaymentType,
                method: safeMethod === 'slip' ? 'Slip' : 'PayHere',
                status: initialStatus,
                slip_image: slipFileNames,
                amount: amount ? parseFloat(parseFloat(amount).toFixed(2)) : 0,
                remark: remark || null 
            }
        });

        // PayHere Delivery Auto-Create Logic...
        if (safeMethod === 'payhere' && newPayment.subjects) {
            try {
                let shouldCreateDelivery = true;
                if (parsedPaymentType === 1) {
                    if (newPayment.groupId) {
                        const ext = await prisma.delivery.findFirst({
                            where: { studentId: newPayment.studentId.toString(), paymentType: 'Monthly', payment: { groupId: newPayment.groupId } }
                        });
                        if (ext) shouldCreateDelivery = false;
                    }
                } else if (parsedPaymentType === 2 || parsedPaymentType === 3) {
                    if (newPayment.batchId) {
                        const ext = await prisma.delivery.findFirst({
                            where: { studentId: newPayment.studentId.toString(), paymentType: { in: ['Installment', 'Full'] }, payment: { batchId: newPayment.batchId } }
                        });
                        if (ext) shouldCreateDelivery = false;
                    }
                }

                if (shouldCreateDelivery) {
                    const subIds = JSON.parse(newPayment.subjects).map(id => parseInt(id));
                    const courses = await prisma.course.findMany({ where: { id: { in: subIds } } });

                    if (courses.length > 0) {
                        const paymentTypeStr = parsedPaymentType === 1 ? 'Monthly' : (parsedPaymentType === 2 ? 'Installment' : 'Full');

                        await prisma.delivery.create({
                            data: {
                                paymentId: newPayment.id,
                                studentId: newPayment.studentId.toString(),
                                businessId: newPayment.businessId,
                                paymentType: paymentTypeStr,
                                status: 'Pending', 
                                items: {
                                    create: courses.map(c => ({
                                        courseId: c.id,
                                        tuteName: c.name || "Tute",
                                        quantity: 1
                                    }))
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
                    group.courses = group.courses.filter(c => allowedSubjectIds.includes(c.id));
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
        
        const contents = await prisma.content.findMany({
            where: { id: { in: contentIds } },
            include: { group: true },
            orderBy: { createdAt: 'desc' }
        });

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
        res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to update password" });
    }
};

// 🔥 NEW: Handle Due Slip Uploads
exports.uploadDueSlip = async (req, res) => {
    try {
        const { paymentId, remark } = req.body;

        const existingPayment = await prisma.payment.findUnique({
            where: { id: parseInt(paymentId) }
        });

        if (!existingPayment) {
            return res.status(404).json({ error: "Payment record not found" });
        }

        // Prevent overwriting already approved (1), expired (3), or discount/free (4) payments
        if (existingPayment.status === 1 || existingPayment.status === 3 || existingPayment.status === 4) {
            return res.status(400).json({ error: "මෙම ගෙවීම දැනටමත් සිදුකර ඇත. නැවත රිසිට්පත් උඩුගත කළ නොහැක." });
        }
        
        const slipFileNames = req.files && req.files.length > 0 
            ? req.files.map(f => f.filename).join(',') 
            : null;

        if (!slipFileNames) {
            return res.status(400).json({ error: "No slips provided" });
        }

        await prisma.payment.update({
            where: { id: parseInt(paymentId) },
            data: {
                slip_image: slipFileNames,
                method: 'Slip',
                status: 0, 
                remark: remark || null
            }
        });

        res.status(200).json({ message: "Slip uploaded successfully" });
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

exports.updateStudentByAdmin = async (req, res) => {
    try {
        const { 
            id, firstName, lastName, phone, whatsapp, optionalPhone, 
            nic, addressHouseNo, addressStreet, city, district 
        } = req.body;

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
        res.status(500).json({ error: "Failed to update student" });
    }
};

exports.resetStudentPassword = async (req, res) => {
    try {
        const { studentId, newPassword } = req.body;
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        await prisma.user.update({
            where: { id: parseInt(studentId) },
            data: { password: hashedPassword }
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

// 🔥 PERMANENT YOUTUBE IFRAME FIX (NO EXTRACTION) 🔥
exports.getVideoStream = async (req, res) => {
    try {
        const videoId = req.params.videoId;
        
        console.log(`🎬 YouTube Iframe request for ID: ${videoId}`);

        if (!videoId) {
            return res.status(400).json({ error: 'Invalid YouTube ID' });
        }

        const embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;

        res.status(200).json({ 
            stream_url: embedUrl,
            is_youtube_embed: true, 
            yt_id: videoId
        });

    } catch (error) {
        console.error("❌ Stream Error:", error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 🔥 NEW: Delete Student Account (Safe Delete with Relations & Debugging) 🔥

// 🔥 FIXED: Pay Due Online
exports.payDueOnline = async (req, res) => {
    try {
        const { paymentId, orderId } = req.body;
        const studentId = req.user?.userId || req.user?.id;

        if (!studentId) return res.status(401).json({ error: "Unauthorized" });

        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        const payment = await prisma.payment.findFirst({
            where: { id: parseInt(paymentId), studentId: studentId.toString() }
        });

        if (!payment) return res.status(404).json({ error: "Payment not found" });

        // update the payment as paid via PayHere
        const updatedPayment = await prisma.payment.update({
            where: { id: parseInt(paymentId) },
            data: {
                status: 1,
                method: 'PayHere',
                remark: payment.remark ? `${payment.remark} | Online Pay ID: ${orderId || 'Direct'}` : `Online Pay ID: ${orderId || 'Direct'}`
            }
        });

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