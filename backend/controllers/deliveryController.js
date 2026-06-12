const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const admin = require("firebase-admin"); 

// ================= DELIVERY POS ACTIONS =================

// 1. Pending & Hold Deliveries ගන්න (Monthly/Full වලට හරියටම Covers & Names එන්න හැදුවා)
exports.getPendingDeliveries = async (req, res) => {
    try {
        const { businessId, paymentType } = req.query;
        
        let whereClause = { 
            status: { in: ['Pending', 'Hold'] },
            payment: { status: 1 }
        };
        if (businessId) whereClause.businessId = parseInt(businessId);
        if (paymentType && paymentType !== 'All') whereClause.paymentType = paymentType;

        const deliveries = await prisma.delivery.findMany({
            where: whereClause,
            include: {
                items: true,
                payment: { include: { student: true, batch: true, group: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        const courseIds = [...new Set(deliveries.flatMap(d => d.items.map(i => i.courseId)).filter(Boolean))];
        const courses = await prisma.course.findMany({
            where: { id: { in: courseIds.map(id => parseInt(id)) } }
        });

        const batchIds = [...new Set(deliveries.map(d => d.payment?.batchId).filter(Boolean))];
        const allGroups = await prisma.group.findMany({
            where: { batchId: { in: batchIds } }
        });

        const studentIds = [...new Set(deliveries.map(d => d.payment?.student?.id).filter(Boolean))];
        const pastDeliveries = await prisma.delivery.findMany({
            where: {
                studentId: { in: studentIds.map(String) },
                status: { notIn: ['Pending', 'Hold'] }
            },
            orderBy: { packedAt: 'desc' },
            include: { payment: { include: { group: true } } }
        });

        const formatted = deliveries.map(d => {
            const std = d.payment?.student || {};
            const addressParts = [std.addressHouseNo, std.addressStreet, std.city, std.district].filter(Boolean);
            const finalAddress = addressParts.length > 0 ? addressParts.join(', ') : 'No Address Provided';
            const labelAddressParts = [std.addressHouseNo, std.addressStreet, std.city].filter(Boolean);
            const finalLabelAddress = labelAddressParts.length > 0 ? labelAddressParts.join(', ') : 'No Address Provided';
            
            // 🔥 FIX: Multiple Phones
            const phoneParts = [std.phone, std.whatsapp, std.optionalPhone].filter(Boolean);
            const finalPhone = [...new Set(phoneParts)].join(' / ') || 'No Phone';
            
            const finalName = std.firstName ? `${std.firstName} ${std.lastName}` : 'Unknown Student';

            const isUpgrade = d.payment?.remark ? d.payment.remark.includes('[UPGRADE]') : false;

            const itemsWithDetails = d.items.map(item => {
                const course = courses.find(c => c.id === item.courseId);
                let lecturerName = course?.lecturerName || 'Lecturer';
                let lecturerImage = 'default.png';
                let tuteCover = 'default-tute.png';
                let actualTuteName = item.tuteName; 

                if (course && course.groupPrices) {
                    try {
                        const gpArr = JSON.parse(course.groupPrices);
                        let matchedGp;
                        
                        if (d.paymentType === 'Full') {
                            const fullGrp = allGroups.find(g => g.batchId === d.payment?.batchId && g.name.toLowerCase().includes('full'));
                            if (fullGrp) {
                                matchedGp = gpArr.find(g => parseInt(g.groupId) === parseInt(fullGrp.id));
                            }
                        }

                        if (!matchedGp && d.payment?.groupId) {
                            matchedGp = gpArr.find(g => parseInt(g.groupId) === parseInt(d.payment.groupId));
                        }
                        
                        if (!matchedGp) matchedGp = gpArr.find(g => g.tuteName === item.tuteName) || gpArr[0];

                        if (matchedGp) {
                            if (matchedGp.lecturerImage) lecturerImage = matchedGp.lecturerImage;
                            if (matchedGp.tuteCover) tuteCover = matchedGp.tuteCover;
                            if (matchedGp.tuteName) actualTuteName = matchedGp.tuteName; 
                        }
                    } catch (e) {}
                }

                return {
                    ...item,
                    tuteName: actualTuteName, 
                    courseName: course?.name || 'Subject',
                    lecturerName,
                    lecturerImage,
                    tuteCover
                };
            });

            const lastDel = pastDeliveries.find(pd => pd.studentId === String(std.id));
            let lastDeliveryInfo = null;
            if (lastDel) {
                lastDeliveryInfo = {
                    packedAt: lastDel.packedAt,
                    trackingNumber: lastDel.trackingNumber,
                    paymentMonth: lastDel.payment?.group?.name || 'No Group',
                    paymentType: lastDel.paymentType
                };
            }

            return {
                ...d,
                studentName: finalName,
                studentNo: std.id ? `STU-${std.id}` : 'STU-000',
                address: finalAddress,
                labelAddress: finalLabelAddress,
                phone: finalPhone, 
                batchName: d.payment?.batch?.name || 'Batch Not Assigned', 
                groupName: d.payment?.group?.name || 'No Group',
                isUpgrade: isUpgrade,
                items: itemsWithDetails,
                lastDelivery: lastDeliveryInfo
            };
        });

        return res.status(200).json(formatted);
    } catch (error) {
        console.error("Fetch Pending Deliveries Error:", error);
        if (!res.headersSent) return res.status(500).json({ error: "Failed to fetch pending deliveries" });
    }
};

// 2. Auto Stock Deduction AT PACKING
exports.packDelivery = async (req, res) => {
    try {
        const { deliveryId, trackingNumber, packRemark } = req.body;

        await prisma.$transaction(async (tx) => {
            const updatedDelivery = await tx.delivery.update({
                where: { id: parseInt(deliveryId) },
                data: { 
                    status: 'Packed', 
                    trackingNumber: trackingNumber,
                    packRemark: packRemark,
                    packedAt: new Date()
                },
                include: { items: true, payment: true }
            });

            for (const item of updatedDelivery.items) {
                const course = await tx.course.findUnique({ where: { id: item.courseId } });
                let actualTuteName = item.tuteName;

                if (course && course.groupPrices) {
                    try {
                        const gp = JSON.parse(course.groupPrices);
                        let matchedGp;

                        if (updatedDelivery.paymentType === 'Full') {
                            const fullGrp = await tx.group.findFirst({
                                where: { batchId: updatedDelivery.payment?.batchId, name: { contains: 'full' } }
                            });
                            if (fullGrp) {
                                matchedGp = gp.find(g => parseInt(g.groupId) === parseInt(fullGrp.id));
                            }
                        }

                        if (!matchedGp && updatedDelivery.payment?.groupId) {
                            matchedGp = gp.find(g => parseInt(g.groupId) === parseInt(updatedDelivery.payment.groupId));
                        }
                        
                        if (!matchedGp) matchedGp = gp.find(g => g.tuteName === item.tuteName) || gp[0];

                        if (matchedGp && matchedGp.tuteName) {
                            actualTuteName = matchedGp.tuteName;
                        }
                    } catch(e) {}
                }

                let stockItem = await tx.tuteStock.findFirst({
                    where: { courseId: parseInt(item.courseId), tuteName: actualTuteName }
                });

                if (!stockItem) {
                    stockItem = await tx.tuteStock.findFirst({
                        where: { courseId: parseInt(item.courseId) }
                    });
                }

                if (stockItem) {
                    const newQty = stockItem.availableQuantity - parseInt(item.quantity);
                    
                    await tx.tuteStock.update({
                        where: { id: stockItem.id },
                        data: { availableQuantity: newQty }
                    });

                    await tx.tuteStockHistory.create({
                        data: {
                            stockId: stockItem.id, 
                            courseId: stockItem.courseId, 
                            tuteName: stockItem.tuteName,
                            action: "REDUCED", 
                            oldQuantity: stockItem.availableQuantity, 
                            newQuantity: newQty, 
                            reason: `Order ORD-${updatedDelivery.id} Packed`
                        }
                    });
                } else {
                    console.log(`⚠️ Stock Item Not Found for CourseID: ${item.courseId}, Tute: ${actualTuteName}`);
                }
            }
        });

        res.status(200).json({ message: "Packed and Stock Deducted Successfully!" });
    } catch (error) {
        console.error("Pack Delivery Error:", error);
        res.status(500).json({ error: "Failed to pack delivery" });
    }
};

// 3. Order එක Hold කරන එක
exports.holdDelivery = async (req, res) => {
    try {
        const { deliveryId, reason, remark } = req.body;
        
        const heldOrder = await prisma.delivery.update({
            where: { id: parseInt(deliveryId) },
            data: { status: 'Hold', holdReason: reason, holdRemark: remark }
        });
        
        res.status(200).json({ message: "Delivery placed on Hold", data: heldOrder });
    } catch (error) {
        res.status(500).json({ error: "Failed to hold delivery" });
    }
};

// ================= TUTE STOCK MANAGEMENT =================

exports.getTuteStocks = async (req, res) => {
    try {
        const stocks = await prisma.tuteStock.findMany({ include: { course: true } });
        res.status(200).json(stocks);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch stock" });
    }
};

exports.addTuteStock = async (req, res) => {
    try {
        const { stockId, quantity, reason } = req.body;
        const oldStock = await prisma.tuteStock.findUnique({ where: { id: parseInt(stockId) } });
        
        const updated = await prisma.tuteStock.update({
            where: { id: parseInt(stockId) },
            data: { availableQuantity: { increment: parseInt(quantity) } }
        });

        await prisma.tuteStockHistory.create({
            data: {
                stockId: updated.id, courseId: updated.courseId, tuteName: updated.tuteName,
                action: "ADDED", oldQuantity: oldStock.availableQuantity, newQuantity: updated.availableQuantity,
                reason: reason || "New stock added"
            }
        });
        res.status(200).json(updated);
    } catch (error) {
        res.status(500).json({ error: "Failed to update stock" });
    }
};

exports.addCustomTute = async (req, res) => {
    try {
        const { courseId, tuteName } = req.body;
        const tuteCover = req.file ? req.file.filename : null;

        if (!courseId || courseId === "null" || courseId === "") {
            return res.status(400).json({ error: "Please select a Subject to link this Extra Tute." });
        }

        const newStock = await prisma.tuteStock.create({
            data: {
                courseId: parseInt(courseId),
                tuteName: tuteName,
                tuteImage: tuteCover,
                availableQuantity: 0
            }
        });
        res.status(201).json(newStock);
    } catch (error) {
        res.status(500).json({ error: "Failed to create custom tute" });
    }
};

exports.editTuteStock = async (req, res) => {
    try {
        const { stockId, newQuantity, reason } = req.body;
        const oldStock = await prisma.tuteStock.findUnique({ where: { id: parseInt(stockId) } });
        const updated = await prisma.tuteStock.update({
            where: { id: parseInt(stockId) },
            data: { availableQuantity: parseInt(newQuantity) }
        });
        await prisma.tuteStockHistory.create({
            data: {
                stockId: updated.id, courseId: updated.courseId, tuteName: updated.tuteName,
                action: oldStock.availableQuantity > newQuantity ? "REDUCED" : "EDITED",
                oldQuantity: oldStock.availableQuantity, newQuantity: updated.availableQuantity, reason: reason
            }
        });
        res.status(200).json({ message: "Stock adjusted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to edit stock" });
    }
};

exports.deleteTuteStock = async (req, res) => {
    try {
        const stockId = parseInt(req.params.id);
        const { reason } = req.query;
        const oldStock = await prisma.tuteStock.findUnique({ where: { id: stockId } });
        await prisma.tuteStockHistory.create({
            data: {
                stockId: oldStock.id, courseId: oldStock.courseId, tuteName: oldStock.tuteName,
                action: "DELETED", oldQuantity: oldStock.availableQuantity, newQuantity: 0, reason: reason || "Item removed"
            }
        });
        await prisma.tuteStock.delete({ where: { id: stockId } });
        res.status(200).json({ message: "Stock item deleted" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete stock" });
    }
};

exports.getStockHistory = async (req, res) => {
    try {
        const { startDate, endDate, page = 1, limit = 10 } = req.query;
        const courseIds = req.params.courseIds ? req.params.courseIds.split(',').map(id => parseInt(id)) : [];

        let whereClause = { courseId: { in: courseIds } };

        if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            whereClause.createdAt = { gte: start, lte: end };
        }

        const total = await prisma.tuteStockHistory.count({ where: whereClause });
        const history = await prisma.tuteStockHistory.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            skip: (parseInt(page) - 1) * parseInt(limit),
            take: parseInt(limit)
        });

        const safeJson = (data) => JSON.parse(JSON.stringify(data, (k, v) => typeof v === 'bigint' ? v.toString() : v));
        res.status(200).json({
            data: safeJson(history),
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error("History Error:", error);
        res.status(500).json({ error: "Failed to fetch history" });
    }
};

exports.getGlobalStock = async (req, res) => {
    try {
        const stocks = await prisma.tuteStock.findMany({
            include: { course: { include: { group: { include: { batch: { include: { business: true } } } } } } },
            orderBy: { availableQuantity: 'asc' }
        });
        const safeJson = (data) => JSON.parse(JSON.stringify(data, (k, v) => typeof v === 'bigint' ? v.toString() : v));
        res.status(200).json(safeJson(stocks));
    } catch (error) { res.status(500).json({ error: "Failed to fetch global stock" }); }
};

exports.getGlobalStockHistory = async (req, res) => {
    try {
        const { startDate, endDate, page = 1, limit = 10 } = req.query;
        let whereClause = {};

        if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            whereClause.createdAt = { gte: start, lte: end };
        }

        const total = await prisma.tuteStockHistory.count({ where: whereClause });
        const history = await prisma.tuteStockHistory.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            skip: (parseInt(page) - 1) * parseInt(limit),
            take: parseInt(limit)
        });

        const safeJson = (data) => JSON.parse(JSON.stringify(data, (k, v) => typeof v === 'bigint' ? v.toString() : v));
        res.status(200).json({
            data: safeJson(history),
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) { res.status(500).json({ error: "Failed to fetch global history" }); }
};

exports.getBatchStock = async (req, res) => {
    try {
        const batchId = parseInt(req.params.batchId);
        
        const groups = await prisma.group.findMany({
            where: { batchId },
            include: { courses: true }
        });

        let allCourseIds = [];
        let requiredTutes = [];

        groups.forEach(g => {
            g.courses.forEach(c => {
                allCourseIds.push(c.id);

                let gpPrices = [];
                try { gpPrices = typeof c.groupPrices === 'string' ? JSON.parse(c.groupPrices) : (c.groupPrices || []); } catch(e){}

                const gpData = gpPrices.find(p => parseInt(p.groupId) === g.id);

                let tName = c.name + " - Tute";
                let tCover = 'default-tute.png';

                if (gpData) {
                    if (gpData.tuteName && gpData.tuteName.trim() !== '') tName = gpData.tuteName;
                    if (gpData.tuteCover) tCover = gpData.tuteCover;
                }

                requiredTutes.push({
                    courseId: c.id,
                    tuteName: tName,
                    tuteImage: tCover
                });
            });
        });

        if (requiredTutes.length > 0) {
            for (const rt of requiredTutes) {
                const exists = await prisma.tuteStock.findFirst({
                    where: { courseId: rt.courseId, tuteName: rt.tuteName }
                });

                if (!exists) {
                    await prisma.tuteStock.create({
                        data: {
                            courseId: rt.courseId,
                            tuteName: rt.tuteName,
                            tuteImage: rt.tuteImage,
                            availableQuantity: 0
                        }
                    });
                }
            }
        }

        if (allCourseIds.length === 0) {
            return res.status(200).json([]);
        }

        const allStocks = await prisma.tuteStock.findMany({
            where: { courseId: { in: allCourseIds.map(id => Number(id)) } },
            include: { 
                course: { 
                    include: { group: true }
                } 
            },
            orderBy: { updatedAt: 'desc' }
        });

        const safeJson = (data) => JSON.parse(JSON.stringify(data, (k, v) => typeof v === 'bigint' ? v.toString() : v));
        res.status(200).json(safeJson(allStocks));

    } catch (error) {
        console.error("Get Batch Stock Error:", error);
        res.status(500).json({ error: "Failed to fetch batch stock." });
    }
};

// ================= DISPATCH / HISTORY & CRON JOBS =================

const cron = require('node-cron');

cron.schedule('0 * * * *', async () => {
    try {
        const tenHoursAgo = new Date(Date.now() - 10 * 60 * 60 * 1000);

        await prisma.delivery.updateMany({
            where: { 
                status: 'Packed',
                packedAt: { lte: tenHoursAgo } 
            },
            data: { 
                status: 'On the way',
                onTheWayAt: new Date()
            }
        });
        console.log("🚚 Auto Delivery Status Updated (Packed -> On the way)");
    } catch (error) {
        console.error("Cron Job Error:", error);
    }
});

cron.schedule('0 8 * * *', async () => {
    try {
        const dispatchedOrders = await prisma.delivery.findMany({
            where: { status: 'On the way' },
            include: { payment: { include: { student: true } } }
        });

        for (const order of dispatchedOrders) {
            const student = order.payment?.student;
            
            if (student && student.fcmToken) {
                const message = {
                    notification: {
                        title: "📦 Delivery Update!",
                        body: "ඔබගේ Tute pack එක මේ වනවිට Dispatch කර ඇත. කරුණාකර App එකට ගොස් Received හෝ Not Received යන්න Update කරන්න."
                    },
                    token: student.fcmToken
                };
                
                try {
                    await admin.messaging().send(message);
                } catch (e) {
                    console.log(`Failed to send FCM to student ${student.id}`);
                }
            }
        }
        console.log("🚚 Daily Dispatch Notifications Sent to Students!");
    } catch (error) {
        console.error("Cron Job Error (Dispatch Notifications):", error);
    }
});

exports.getDispatchDeliveries = async (req, res) => {
    try {
        const { businessId } = req.query;
        
        let whereClause = {
            status: { notIn: ['Pending', 'Hold'] } 
        };
        
        if (businessId) whereClause.businessId = parseInt(businessId);

        const deliveries = await prisma.delivery.findMany({
            where: whereClause,
            include: {
                items: true,
                payment: { 
                    include: { student: true, batch: true } 
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        const courseIds = [...new Set(deliveries.flatMap(d => d.items.map(i => i.courseId)).filter(Boolean))];
        const courses = await prisma.course.findMany({
            where: { id: { in: courseIds.map(id => parseInt(id)) } }
        });

        const formatted = deliveries.map(d => {
            const std = d.payment?.student || {};
            const addressParts = [std.addressHouseNo, std.addressStreet, std.city, std.district].filter(Boolean);
            const labelAddressParts = [std.addressHouseNo, std.addressStreet, std.city].filter(Boolean);
            
            // 🔥 FIX: ළමයාගේ තියෙන ඔක්කොම වෙනස් Phone Numbers එකතු කරලා Sticker එකට යවනවා
            const phoneParts = [std.phone, std.whatsapp, std.optionalPhone].filter(Boolean);
            const finalPhone = [...new Set(phoneParts)].join(' / ') || 'No Phone';

            return {
                ...d,
                studentName: std.firstName ? `${std.firstName} ${std.lastName}` : 'Unknown Student',
                address: addressParts.length > 0 ? addressParts.join(', ') : 'No Address Provided',
                labelAddress: labelAddressParts.length > 0 ? labelAddressParts.join(', ') : 'No Address Provided',
                phone: finalPhone, // 🔥 Updated Multiple Phones
                batchName: d.payment?.batch?.name || 'Batch Not Assigned',
                items: d.items.map(item => {
                    const course = courses.find(c => c.id === item.courseId);
                    return {
                        ...item,
                        courseName: course?.name || 'Subject',
                        lecturerName: course?.lecturerName || 'Lecturer'
                    };
                })
            };
        });

        return res.status(200).json(formatted);
    } catch (error) {
        console.error("Fetch Dispatch Error:", error);
        res.status(500).json({ error: "Failed to fetch dispatch deliveries" });
    }
};

// 🔥 Replace ONLY getAdvancedHistory in delivery.controller.js
exports.getAdvancedHistory = async (req, res) => {
    try {
        const { page = 1, limit = 15, search, businessId, batchId, paymentType, status, startDate, endDate } = req.query;
        
        let whereClause = {};

        if (status) {
            if (status === 'Dispatched') whereClause.status = { in: ['Packed', 'On the way'] };
            else if (status === 'Delivered') whereClause.status = 'Received';
            else whereClause.status = status; 
        } else {
            whereClause.status = { notIn: ['Pending', 'Hold'] }; 
        }

        if (businessId) whereClause.businessId = parseInt(businessId);
        if (paymentType) whereClause.paymentType = paymentType;
        
        if (startDate && endDate) {
            const start = new Date(startDate); start.setHours(0, 0, 0, 0);
            const end = new Date(endDate); end.setHours(23, 59, 59, 999);
            whereClause.updatedAt = { gte: start, lte: end };
        }

        if (search) {
            const searchNum = parseInt(search.replace(/\D/g, ''));
            const orConditions = [
                { trackingNumber: { contains: search } },
                { payment: { student: { firstName: { contains: search } } } },
                { payment: { student: { phone: { contains: search } } } }
            ];
            if (!isNaN(searchNum)) {
                orConditions.push({ id: searchNum });
            }
            whereClause.OR = orConditions;
        }

        if (batchId) {
            whereClause.payment = { ...whereClause.payment, batchId: parseInt(batchId) };
        }

        const businesses = await prisma.business.findMany({ select: { id: true, name: true } });
        const total = await prisma.delivery.count({ where: whereClause });
        
        const deliveries = await prisma.delivery.findMany({
            where: whereClause,
            include: {
                items: true, 
                payment: { include: { student: true, batch: true } }
            },
            orderBy: { updatedAt: 'desc' },
            skip: (parseInt(page) - 1) * parseInt(limit),
            take: parseInt(limit)
        });

        const courses = await prisma.course.findMany();
        
        const batchIds = [...new Set(deliveries.map(d => d.payment?.batchId).filter(Boolean))];
        const allGroups = await prisma.group.findMany({
            where: { batchId: { in: batchIds } }
        });

        const formatted = deliveries.map(d => {
            const bizName = businesses.find(b => b.id === d.businessId)?.name || 'Unknown';
            const std = d.payment?.student || {};
            const addressParts = [std.addressHouseNo, std.addressStreet, std.city, std.district].filter(Boolean);
            const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : 'No Address Provided';
            const labelAddressParts = [std.addressHouseNo, std.addressStreet, std.city].filter(Boolean);
            const fullLabelAddress = labelAddressParts.length > 0 ? labelAddressParts.join(', ') : 'No Address Provided';

            // 🔥 FIX: ළමයාගේ තියෙන ඔක්කොම වෙනස් Phone Numbers එකතු කරලා Sticker එකට යවනවා
            const phoneParts = [std.phone, std.whatsapp, std.optionalPhone].filter(Boolean);
            const finalPhone = [...new Set(phoneParts)].join(' / ') || 'No Phone';

            // 🔥 FIX: Resolve actual tute name dynamically like in getPendingDeliveries
            const itemsWithDetails = d.items.map(item => {
                const course = courses.find(c => c.id === item.courseId);
                let actualTuteName = item.tuteName; // Default

                if (course && course.groupPrices) {
                    try {
                        const gpArr = JSON.parse(course.groupPrices);
                        let matchedGp;
                        
                        if (d.paymentType === 'Full') {
                            const fullGrp = allGroups.find(g => g.batchId === d.payment?.batchId && g.name.toLowerCase().includes('full'));
                            if (fullGrp) {
                                matchedGp = gpArr.find(g => parseInt(g.groupId) === parseInt(fullGrp.id));
                            }
                        }

                        if (!matchedGp && d.payment?.groupId) {
                            matchedGp = gpArr.find(g => parseInt(g.groupId) === parseInt(d.payment.groupId));
                        }
                        
                        if (!matchedGp) matchedGp = gpArr.find(g => g.tuteName === item.tuteName) || gpArr[0];

                        if (matchedGp && matchedGp.tuteName) {
                            actualTuteName = matchedGp.tuteName;
                        }
                    } catch (e) {}
                }

                return {
                    ...item,
                    tuteName: actualTuteName
                };
            });

            return {
                id: d.id,
                studentName: std.firstName ? `${std.firstName} ${std.lastName}` : 'Unknown',
                phone: finalPhone, // 🔥 Updated Multiple Phones
                address: fullAddress, 
                labelAddress: fullLabelAddress,
                businessName: bizName,
                batchName: d.payment?.batch?.name || 'No Batch',
                paymentType: d.paymentType,
                status: d.status,
                trackingNumber: d.trackingNumber,
                packedAt: d.packedAt,
                packRemark: d.packRemark,
                items: itemsWithDetails
            };
        });

        const safeJson = (data) => JSON.parse(JSON.stringify(data, (k, v) => typeof v === 'bigint' ? v.toString() : v));

        res.status(200).json(safeJson({
            data: formatted,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        }));

    } catch (error) {
        console.error("Advanced History fetch error:", error);
        res.status(500).json({ error: "Failed to fetch history" });
    }
};

exports.manualConfirmDelivery = async (req, res) => {
    try {
        const { deliveryId } = req.params;
        const updatedDelivery = await prisma.delivery.update({
            where: { id: parseInt(deliveryId) },
            data: { 
                status: 'Received', 
                resolvedAt: new Date()
            }
        });
        res.status(200).json({ message: `Delivery marked as Delivered`, data: updatedDelivery });
    } catch (error) {
        res.status(500).json({ error: "Failed to manually update delivery." });
    }
};

// ================= DASHBOARD STATS & REPORTS =================

exports.getDeliveryStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const pending = await prisma.delivery.count({ where: { status: 'Pending' } });
        const onHold = await prisma.delivery.count({ where: { status: 'Hold' } });
        const dispatched = await prisma.delivery.count({ where: { status: 'On the way' } });
        const returned = await prisma.delivery.count({ where: { status: 'Returned' } }); 
        const totalDelivered = await prisma.delivery.count({ where: { status: 'Received' } });
        const deliveredToday = await prisma.delivery.count({ 
            where: { status: 'Received', resolvedAt: { gte: today } } 
        });
        const lowStock = await prisma.tuteStock.count({
            where: { availableQuantity: { lte: 10 } }
        });

        const statusDistribution = [
            { name: 'Pending', value: pending, color: '#3b82f6' }, 
            { name: 'Dispatched', value: dispatched, color: '#8b5cf6' }, 
            { name: 'Delivered', value: totalDelivered, color: '#10b981' }, 
            { name: 'Hold', value: onHold, color: '#f97316' }, 
        ].filter(s => s.value > 0);

        const recentDeliveries = await prisma.delivery.findMany({
            where: { updatedAt: { gte: sevenDaysAgo } },
            select: { status: true, updatedAt: true }
        });

        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const weeklyTrendMap = {};

        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            weeklyTrendMap[daysOfWeek[d.getDay()]] = { name: daysOfWeek[d.getDay()], Packed: 0, Delivered: 0 };
        }

        recentDeliveries.forEach(del => {
            const dayName = daysOfWeek[new Date(del.updatedAt).getDay()];
            if (weeklyTrendMap[dayName]) {
                if (del.status === 'Packed' || del.status === 'On the way') weeklyTrendMap[dayName].Packed += 1;
                if (del.status === 'Received') weeklyTrendMap[dayName].Delivered += 1;
            }
        });
        const weeklyTrend = Object.values(weeklyTrendMap);

        const businessCounts = await prisma.delivery.groupBy({
            by: ['businessId'],
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 3
        });

        const businesses = await prisma.business.findMany({
            where: { id: { in: businessCounts.map(b => b.businessId).filter(id => id !== null) } },
            select: { id: true, name: true }
        });

        const maxOrders = businessCounts[0]?._count.id || 1;
        const topBusinesses = businessCounts.map(bc => {
            const biz = businesses.find(b => b.id === bc.businessId);
            return {
                name: biz ? biz.name : 'Unknown Business',
                orders: bc._count.id,
                progress: Math.round((bc._count.id / maxOrders) * 100)
            };
        });

        const latestUpdates = await prisma.delivery.findMany({
            take: 5,
            orderBy: { updatedAt: 'desc' },
            select: { id: true, status: true, updatedAt: true }
        });

        const timeSince = (date) => {
            const seconds = Math.floor((new Date() - new Date(date)) / 1000);
            if (seconds < 60) return `${seconds} secs ago`;
            if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`;
            if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
            return `${Math.floor(seconds / 86400)} days ago`;
        };

        const recentActivity = latestUpdates.map((update, index) => {
            let type = 'info';
            let text = `Order ORD-${update.id} updated to ${update.status}`;
            
            if (update.status === 'Received') { type = 'success'; text = `Order ORD-${update.id} delivered successfully`; }
            else if (update.status === 'Hold') { type = 'error'; text = `Order ORD-${update.id} placed on hold`; }
            else if (update.status === 'Packed') { type = 'info'; text = `Order ORD-${update.id} packed and ready`; }
            else if (update.status === 'On the way') { type = 'info'; text = `Order ORD-${update.id} dispatched via courier`; }

            return { id: index + 1, text, time: timeSince(update.updatedAt), type };
        });

        res.status(200).json({ 
            pending, onHold, dispatched, deliveredToday, lowStock, returned,
            statusDistribution, weeklyTrend, topBusinesses, recentActivity
        });

    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
};

exports.getTuteDeliveryReport = async (req, res) => {
    try {
        const { startDate, endDate, businessId, batchId, paymentType } = req.query;

        let whereClause = { status: { in: ['Packed', 'On the way', 'Received'] } };

        if (businessId) whereClause.businessId = parseInt(businessId);
        if (paymentType) whereClause.paymentType = paymentType;
        
        if (startDate && endDate) {
            const start = new Date(startDate); start.setHours(0, 0, 0, 0);
            const end = new Date(endDate); end.setHours(23, 59, 59, 999);
            whereClause.updatedAt = { gte: start, lte: end };
        }

        const deliveries = await prisma.delivery.findMany({
            where: whereClause,
            include: {
                items: true,
                payment: { include: { student: true, batch: true, group: true } }
            },
            orderBy: { updatedAt: 'desc' }
        });

        const allBusinesses = await prisma.business.findMany({ select: { id: true, name: true } });
        const reportMap = {};

        deliveries.forEach(d => {
            if (batchId && d.payment?.batchId !== parseInt(batchId)) return;

            const biz = allBusinesses.find(b => b.id === d.businessId);
            const bizName = biz ? biz.name : 'Unknown Business';
            const bName = d.payment?.batch?.name || 'Unknown Batch';
            const payType = d.paymentType || 'Unknown';

            d.items.forEach(item => {
                const key = `${bizName}-${bName}-${payType}-${item.courseId}-${item.tuteName}`;
                if (!reportMap[key]) {
                    reportMap[key] = { 
                        businessName: bizName,
                        batchName: bName,
                        paymentType: payType,
                        courseId: item.courseId, 
                        tuteName: item.tuteName, 
                        deliveredQty: 0 
                    };
                }
                reportMap[key].deliveredQty += item.quantity; 
            });
        });

        const courseIds = Object.values(reportMap).map(r => parseInt(r.courseId));
        const [courses, stocks] = await Promise.all([
            prisma.course.findMany({ where: { id: { in: courseIds } } }),
            prisma.tuteStock.findMany({ where: { courseId: { in: courseIds } } })
        ]);

        const finalReport = Object.values(reportMap).map(r => {
            const course = courses.find(c => c.id === r.courseId);
            const stockItem = stocks.find(s => s.courseId === r.courseId && s.tuteName === r.tuteName);
            return {
                businessName: r.businessName,
                batchName: r.batchName,
                paymentType: r.paymentType,
                courseName: course?.name || 'Unknown Subject',
                tuteName: r.tuteName, 
                deliveredQty: r.deliveredQty,
                currentStock: stockItem?.availableQuantity || 0
            };
        });

        finalReport.sort((a, b) => b.deliveredQty - a.deliveredQty);

        const safeJson = (data) => JSON.parse(JSON.stringify(data, (k, v) => typeof v === 'bigint' ? v.toString() : v));
        res.status(200).json(safeJson(finalReport));

    } catch (error) {
        console.error("Report Generation Error:", error);
        res.status(500).json({ error: "Failed to generate report" });
    }
};

// ================= STUDENT SIDE TRACKING =================

exports.getMyDeliveries = async (req, res) => {
    try {
        const studentId = req.user.id; 

        const deliveries = await prisma.delivery.findMany({
            where: { studentId: studentId },
            include: { items: true },
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json(deliveries);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch deliveries." });
    }
};

exports.confirmDelivery = async (req, res) => {
    try {
        const { deliveryId, status } = req.body;
        const studentId = req.user.id;

        const existingDelivery = await prisma.delivery.findFirst({
            where: { id: parseInt(deliveryId), studentId: studentId }
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

        res.status(200).json({ message: `Delivery marked as ${status}`, data: updatedDelivery });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to update delivery status." });
    }
};

exports.getDeliveryPaymentDetails = async (req, res) => {
    try {
        const { businessId, paymentType, installmentNo } = req.query;
        
        let whereClause = {};

        if (businessId) whereClause.businessId = parseInt(businessId);
        
        // Let's filter payments based on type/installment in JS since Prisma relation filters can be tricky, 
        // or we can use relation filters.
        if (paymentType && paymentType !== 'All' && paymentType !== 'Mixed') {
            whereClause.paymentType = paymentType;
        }

        const deliveries = await prisma.delivery.findMany({
            where: whereClause,
            include: {
                payment: {
                    include: { student: true, batch: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        let formatted = deliveries.map(d => {
            const std = d.payment?.student || {};
            const addressParts = [std.addressHouseNo, std.addressStreet, std.city, std.district].filter(Boolean);
            const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : 'No Address Provided';

            const phoneParts = [std.phone, std.whatsapp, std.optionalPhone].filter(Boolean);
            const finalPhone = [...new Set(phoneParts)].join(' / ') || 'No Phone';

            let paymentTypeStr = d.paymentType;
            let installNo = d.payment?.installment_no || 1;

            return {
                id: d.id,
                paymentId: d.payment?.id,
                studentName: std.firstName ? `${std.firstName} ${std.lastName}` : 'Unknown',
                studentId: std.id ? `STU-${std.id}` : 'N/A',
                phone: finalPhone,
                address: fullAddress, 
                businessId: d.businessId,
                batchName: d.payment?.batch?.name || 'No Batch',
                paymentType: paymentTypeStr,
                installmentNo: installNo,
                paymentDate: d.payment?.created_at ? new Date(d.payment.created_at).toISOString().split('T')[0] : 'N/A',
                status: d.status
            };
        });

        // Handle Mixed Payments logic if we want to support 'Mixed' filter (similar to PendingHolds)
        // A mixed payment is where a student has multiple delivery records.
        const counts = {};
        formatted.forEach(d => {
            const key = d.phone;
            if(key) counts[key] = (counts[key] || 0) + 1;
        });

        formatted = formatted.map(d => ({
            ...d,
            isMix: counts[d.phone] > 1
        }));

        if (paymentType === 'Mixed') {
            formatted = formatted.filter(d => d.isMix);
        } else if (paymentType && paymentType !== 'All') {
            formatted = formatted.filter(d => !d.isMix && d.paymentType === paymentType);
        } else if (paymentType === 'All') {
            formatted = formatted.filter(d => !d.isMix);
        }

        if (installmentNo) {
            formatted = formatted.filter(d => parseInt(d.installmentNo) === parseInt(installmentNo));
        }

        const safeJson = (data) => JSON.parse(JSON.stringify(data, (k, v) => typeof v === 'bigint' ? v.toString() : v));

        res.status(200).json(safeJson(formatted));

    } catch (error) {
        console.error("Payment Details fetch error:", error);
        res.status(500).json({ error: "Failed to fetch payment details" });
    }
};