const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const admin = require("firebase-admin");
const axios = require('axios');
const { getScopedBusinessId } = require('../utils/scopeUtils');

// 🔥 පරණ Hardcoded Keys අයින් කළා. දැන් කෙලින්ම ගන්නේ .env ෆයිල් එකෙන් 🔥

const getZoomDirectMp4Link = async (meetingId) => {
    const cleanMeetingId = meetingId.replace(/\s+/g, '');
    console.log(`\n================ ZOOM DEBUG START ================`);
    console.log(`[1] Requested Meeting ID: "${cleanMeetingId}" (Original: "${meetingId}")`);

    try {
        let zoomAccounts = [];
        try {
            zoomAccounts = await prisma.zoomAccount.findMany({ where: { isActive: true } });
        } catch (e) {
            console.error("[!] Error fetching zoom accounts from DB:", e);
        }

        // If no accounts in DB, fallback to .env
        if (zoomAccounts.length === 0) {
            zoomAccounts.push({
                name: 'Default ENV Account',
                accountId: process.env.ZOOM_ACCOUNT_ID,
                clientId: process.env.ZOOM_CLIENT_ID,
                clientSecret: process.env.ZOOM_CLIENT_SECRET
            });
        }

        for (const account of zoomAccounts) {
            console.log(`[>>] Trying Account: ${account.name || 'Unknown'}`);
            if (!account.accountId || !account.clientId || !account.clientSecret) {
                console.error(`[!] Missing credentials for account: ${account.name}`);
                continue;
            }

            try {
                const authHeader = Buffer.from(`${account.clientId}:${account.clientSecret}`).toString('base64');
                const tokenRes = await axios.post(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${account.accountId}`, null, {
                    headers: { 'Authorization': `Basic ${authHeader}` }
                });

                const accessToken = tokenRes.data.access_token;
                const searchTarget = cleanMeetingId.includes('/') ? encodeURIComponent(encodeURIComponent(cleanMeetingId)) : cleanMeetingId;
                
                // Try fetching recording directly
                let recRes = await axios.get(`https://api.zoom.us/v2/meetings/${searchTarget}/recordings`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` },
                    validateStatus: function (status) { return status < 500; }
                });

                // If 404 on numeric meeting ID, check past instances
                if (recRes.status === 404 && /^\d+$/.test(cleanMeetingId)) {
                    try {
                        const instRes = await axios.get(`https://api.zoom.us/v2/past_meetings/${cleanMeetingId}/instances`, {
                            headers: { 'Authorization': `Bearer ${accessToken}` },
                            validateStatus: function (status) { return status < 500; }
                        });
                        if (instRes.status === 200 && instRes.data && instRes.data.meetings && instRes.data.meetings.length > 0) {
                            const latestInst = instRes.data.meetings[instRes.data.meetings.length - 1];
                            const encodedUuid = encodeURIComponent(encodeURIComponent(latestInst.uuid));
                            recRes = await axios.get(`https://api.zoom.us/v2/meetings/${encodedUuid}/recordings`, {
                                headers: { 'Authorization': `Bearer ${accessToken}` },
                                validateStatus: function (status) { return status < 500; }
                            });
                        }
                    } catch (instErr) {}
                }

                if (recRes.status === 200 && recRes.data && recRes.data.recording_files) {
                    const mp4File = recRes.data.recording_files.find(file => file.file_type === 'MP4');
                    if (mp4File) {
                        console.log(`[✔] MP4 Found in account ${account.name}! Size: ${(mp4File.file_size / (1024*1024)).toFixed(2)} MB`);
                        console.log(`================ ZOOM DEBUG END ================\n`);
                        return `${mp4File.download_url}?access_token=${accessToken}`;
                    }
                } else if (recRes.status === 404) {
                    console.log(`[x] Recording not found in ${account.name}, trying next...`);
                } else {
                    console.log(`[!] Unexpected status ${recRes.status} from ${account.name}`);
                }
            } catch (innerError) {
                console.error(`[!] Error fetching from account ${account.name}:`, innerError.message);
            }
        }
        
        console.log(`[!] Error: MP4 not found in any available Zoom accounts.`);
        console.log(`================ ZOOM DEBUG END ================\n`);
        return null;
    } catch (error) {
        console.error(`[!] SYSTEM ERROR in getZoomDirectMp4Link:`, error.message);
        console.log(`================ ZOOM DEBUG END ================\n`);
        return null;
    }
};

const getTypeInt = (typeStr) => {
    switch (typeStr) {
        case 'live': return 1; case 'recording': return 2; case 'document': return 3; case 'sPaper': return 4; case 'paper': return 5;
        default: return parseInt(typeStr) || 1;
    }
};

const safeStr = (val) => Array.isArray(val) ? val[0] : (val || '');

// ================= BUSINESS =================
exports.createBusiness = async (req, res) => {
    try {
        const { name, category, medium, description, streams, isDiscountEnabledForInstallments } = req.body;
        const logo = req.file ? req.file.filename : 'default.png';
        const newBiz = await prisma.business.create({
            data: { name, category, medium, description, streams, logo, isDiscountEnabledForInstallments: parseInt(isDiscountEnabledForInstallments || 0) }
        });
        res.status(201).json(newBiz);
    } catch (error) { res.status(500).json({ error: "Failed to create business" }); }
};

exports.updateBusiness = async (req, res) => {
    try {
        const { businessId, name, category, medium, description, streams, isDiscountEnabledForInstallments } = req.body;
        let updateData = { name, category, medium, description, streams, isDiscountEnabledForInstallments: parseInt(isDiscountEnabledForInstallments || 0) };
        if (req.file) updateData.logo = req.file.filename;
        const updatedBiz = await prisma.business.update({ where: { id: parseInt(businessId) }, data: updateData });
        res.status(200).json(updatedBiz);
    } catch (error) { res.status(500).json({ error: "Failed to update business" }); }
};

exports.deleteBusiness = async (req, res) => {
    try {
        await prisma.business.delete({ where: { id: parseInt(req.body.business_id) } });
        res.status(200).json({ message: "Business Deleted" });
    } catch (e) { res.status(500).json({ error: "Failed to delete business. Please delete its batches first." }); }
};

exports.toggleBusinessStatus = async (req, res) => {
    try {
        const { business_id, status } = req.body;
        const updatedBiz = await prisma.business.update({
            where: { id: parseInt(business_id) },
            data: { status: parseInt(status) }
        });
        res.status(200).json(updatedBiz);
    } catch (error) { 
        res.status(500).json({ error: "Failed to update business visibility" }); 
    }
};

// ================= BATCHES & LECTURERS =================
exports.getBatchesByBusiness = async (req, res) => {
    try {
        const batches = await prisma.batch.findMany({
            where: { businessId: parseInt(req.params.bizId) },
            include: { groups: { include: { courses: true } } }
        });
        const safeData = JSON.parse(JSON.stringify(batches, (key, value) => typeof value === 'bigint' ? value.toString() : value));
        console.log("SENDING BATCHES-FULL:", JSON.stringify(safeData).substring(0, 500)); res.status(200).json({ batches: safeData });
    } catch (error) { res.status(500).json({ error: "Failed to fetch batches" }); }
};

exports.createBatch = async (req, res) => {
    try {
        const { business_id, name, type, itemOrder, description } = req.body;
        const logo = req.file ? req.file.filename : null;
        await prisma.batch.create({
            data: { businessId: parseInt(business_id), name, type: parseInt(type), itemOrder: parseInt(itemOrder || 1), description, logo }
        });
        res.status(201).json({ message: "Created" });
    } catch (e) { res.status(500).json({ error: "Failed to create batch" }); }
};

exports.updateBatch = async (req, res) => {
    try {
        const { batch_id, name, type, itemOrder, description } = req.body;
        const data = { name, type: parseInt(type), itemOrder: parseInt(itemOrder || 1), description };
        if (req.file) data.logo = req.file.filename;
        await prisma.batch.update({ where: { id: parseInt(batch_id) }, data });
        res.status(200).json({ message: "Updated" });
    } catch (e) { res.status(500).json({ error: "Failed to update batch" }); }
};

exports.deleteBatch = async (req, res) => {
    try {
        await prisma.batch.delete({ where: { id: parseInt(req.body.batch_id) } });
        res.status(200).json({ message: "Batch Deleted" });
    } catch (e) { res.status(500).json({ error: "Failed to delete batch. Please delete its groups first." }); }
};

exports.updateBatchLecturers = async (req, res) => {
    try {
        const { batch_id, lecturers } = req.body;
        const updated = await prisma.batch.update({
            where: { id: parseInt(batch_id) },
            data: { lecturers: JSON.stringify(lecturers || []) }
        });
        res.status(200).json(updated);
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: "Failed to update lecturers" }); 
    }
};

exports.toggleBatchStatus = async (req, res) => {
    try {
        const { batch_id, status } = req.body;
        const updatedBatch = await prisma.batch.update({
            where: { id: parseInt(batch_id) },
            data: { status: parseInt(status) }
        });
        res.status(200).json(updatedBatch);
    } catch (error) { 
        res.status(500).json({ error: "Failed to update batch visibility" }); 
    }
};

// ================= GROUPS =================
exports.createGroup = async (req, res) => {
    try {
        const { batch_id, name, paymentType, itemOrder, discountRules } = req.body;
        const newGroup = await prisma.group.create({
            data: { batchId: parseInt(batch_id), name, type: paymentType === 'Monthly' ? 1 : 2, itemOrder: parseInt(itemOrder || 1), discount_rules: JSON.stringify(discountRules || []) }
        });
        res.status(201).json(newGroup);
    } catch (e) { res.status(500).json({ error: "Failed to create group" }); }
};

exports.updateGroup = async (req, res) => {
    try {
        const { group_id, name, paymentType, itemOrder, discountRules } = req.body;
        const updated = await prisma.group.update({
            where: { id: parseInt(group_id) }, data: { name, type: paymentType === 'Monthly' ? 1 : 2, itemOrder: parseInt(itemOrder || 1), discount_rules: JSON.stringify(discountRules || []) }
        });
        res.status(200).json(updated);
    } catch (e) { res.status(500).json({ error: "Failed to update group" }); }
};

exports.deleteGroup = async (req, res) => {
    try {
        const { group_id } = req.body;
        await prisma.group.delete({ 
            where: { id: parseInt(group_id) } 
        });
        res.status(200).json({ message: "Payment Group Deleted" });
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: "Failed to delete group. Please remove subjects assigned to this group first." }); 
    }
};

// ================= SUBJECTS =================
exports.createSubject = async (req, res) => {
    try {
        const name = safeStr(req.body.name);
        const code = safeStr(req.body.code);
        const stream = safeStr(req.body.stream);
        const description = safeStr(req.body.description);
        const lecturerName = safeStr(req.body.lecturerName);
        const itemOrder = safeStr(req.body.itemOrder);
        const groupPrices = safeStr(req.body.groupPrices);
        const isDiscountExcluded = safeStr(req.body.isDiscountExcluded);
        let streamsStr = safeStr(req.body.streams);

        let lecturerImage = null;
        if (req.files && req.files.length > 0) {
             const lecImageFile = req.files.find(f => f.fieldname === 'lecturerImage');
             if (lecImageFile) lecturerImage = lecImageFile.filename;
        }

        try {
            if (typeof streamsStr === 'string' && !streamsStr.startsWith('[')) streamsStr = JSON.stringify([streamsStr]);
        } catch(e) {}

        const parsedPrices = JSON.parse(groupPrices || '[]');
        const excludeDiscount = isDiscountExcluded === 'true' || isDiscountExcluded === '1';
        
        if (parsedPrices.length === 0) return res.status(400).json({ error: "Please select at least one group" });

        if (req.files && req.files.length > 0) {
            parsedPrices.forEach(gp => {
                const file = req.files.find(f => f.fieldname === `tuteCover_${gp.groupId}`);
                if (file) gp.tuteCover = file.filename;
            });
        }

        // 🔥 NEW FIX: Tute Cover එකයි Name එකයි අනිත් Groups වලටත් Share කරනවා (Monthly/Full දෙකටම)
        const commonCover = parsedPrices.find(gp => gp.tuteCover)?.tuteCover;
        const commonTuteName = parsedPrices.find(gp => gp.tuteName)?.tuteName;
        const commonTutes = parsedPrices.find(gp => gp.tutes && gp.tutes.length > 0)?.tutes;

        parsedPrices.forEach(gp => {
            if (!gp.tuteCover && commonCover) gp.tuteCover = commonCover;
            if (!gp.tuteName && commonTuteName) gp.tuteName = commonTuteName;
            if ((!gp.tutes || gp.tutes.length === 0) && commonTutes) gp.tutes = commonTutes;
        });
        console.log("START MONTH IN REQ:", req.body.startMonth, "END MONTH IN REQ:", req.body.endMonth);
        console.log("UPDATE SUBJECT RECEIVED START MONTH:", req.body.startMonth, "END MONTH:", req.body.endMonth);
        const getMonthVal = (val) => {
            const s = safeStr(val);
            return (s === 'null' || s === 'undefined' || s === '') ? null : s;
        };
        const startMonth = getMonthVal(req.body.startMonth);
        const endMonth = getMonthVal(req.body.endMonth);

        let activeMonths = null;
        if (startMonth && endMonth) {
            const monthsList = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            const startIndex = monthsList.indexOf(startMonth);
            const endIndex = monthsList.indexOf(endMonth);
            if (startIndex !== -1 && endIndex !== -1) {
                if (endIndex >= startIndex) {
                    activeMonths = endIndex - startIndex + 1;
                } else {
                    activeMonths = (12 - startIndex) + endIndex + 1;
                }
            }
        }

        const coursePromises = parsedPrices.map(gp => {
            if (lecturerImage) gp.lecturerImage = lecturerImage;
            gp.deliverTute = gp.deliverTute === true || gp.deliverTute === 'true';

            return prisma.course.create({
                data: { 
                    name, code, stream, streams: streamsStr, description, lecturerName,
                    itemOrder: parseInt(itemOrder || 1), price: parseFloat(gp.price || 0), 
                    groupPrices: JSON.stringify(parsedPrices), groupId: parseInt(gp.groupId),
                    isDiscountExcluded: excludeDiscount,
                    activeMonths, startMonth, endMonth
                }
            });
        });

        await Promise.all(coursePromises);
        res.status(201).json({ message: "Created in all selected groups" });
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: "Failed to create subject" }); 
    }
};

exports.updateSubject = async (req, res) => {
    try {
        const course_id = safeStr(req.body.course_id);
        const name = safeStr(req.body.name);
        const code = safeStr(req.body.code);
        const stream = safeStr(req.body.stream);
        const description = safeStr(req.body.description);
        const lecturerName = safeStr(req.body.lecturerName);
        const itemOrder = safeStr(req.body.itemOrder);
        const groupPrices = safeStr(req.body.groupPrices);
        const isDiscountExcluded = safeStr(req.body.isDiscountExcluded);
        const batch_id = safeStr(req.body.batch_id); 
        let streamsStr = safeStr(req.body.streams);

        let lecturerImage = null;
        if (req.files && req.files.length > 0) {
             const lecImageFile = req.files.find(f => f.fieldname === 'lecturerImage');
             if (lecImageFile) lecturerImage = lecImageFile.filename;
        }

        try {
            if (typeof streamsStr === 'string' && !streamsStr.startsWith('[')) streamsStr = JSON.stringify([streamsStr]);
        } catch(e) {}

        const parsedPrices = JSON.parse(groupPrices || '[]');
        console.log("RECEIVED GROUP PRICES: ", groupPrices);
        const excludeDiscount = isDiscountExcluded === 'true' || isDiscountExcluded === '1';

        const originalCourse = await prisma.course.findUnique({ where: { id: parseInt(course_id) } });
        if (!originalCourse) return res.status(404).json({ error: "Course not found" });

        // Map uploaded tute covers
        if (req.files && req.files.length > 0) {
            parsedPrices.forEach(gp => {
                const file = req.files.find(f => f.fieldname === `tuteCover_${gp.groupId}`);
                if (file) gp.tuteCover = file.filename;
            });
        }

        for (let i = 0; i < parsedPrices.length; i++) {
            let gp = parsedPrices[i];
            const existingCourse = await prisma.course.findFirst({
                where: { name: originalCourse.name, groupId: parseInt(gp.groupId) }
            });
            
            const existingGpData = existingCourse ? JSON.parse(existingCourse.groupPrices || '[]').find(p => parseInt(p.groupId) === parseInt(gp.groupId)) : null;
            
            if (existingGpData) {
                if (!lecturerImage && existingGpData.lecturerImage) gp.lecturerImage = existingGpData.lecturerImage;
                if (!gp.tuteCover && existingGpData.tuteCover) gp.tuteCover = existingGpData.tuteCover;
                if (!gp.tuteName && existingGpData.tuteName) gp.tuteName = existingGpData.tuteName;
            }
            if (lecturerImage) gp.lecturerImage = lecturerImage;
            
            gp.deliverTute = gp.deliverTute === true || gp.deliverTute === 'true';
            gp._existingCourse = existingCourse;
        }

        // 🔥 NEW FIX: Update කරද්දීත් Tute Cover එකයි Name එකයි Share කරනවා
        const commonCover = parsedPrices.find(gp => gp.tuteCover)?.tuteCover;
        const commonTuteName = parsedPrices.find(gp => gp.tuteName)?.tuteName;
        const commonTutes = parsedPrices.find(gp => gp.tutes && gp.tutes.length > 0)?.tutes;

        parsedPrices.forEach(gp => {
            if (!gp.tuteCover && commonCover) gp.tuteCover = commonCover;
            if (!gp.tuteName && commonTuteName) gp.tuteName = commonTuteName;
            if ((!gp.tutes || gp.tutes.length === 0) && commonTutes) gp.tutes = commonTutes;
        });

        const finalGroupPricesStr = JSON.stringify(parsedPrices.map(gp => {
            const { _existingCourse, ...cleanGp } = gp;
            return cleanGp;
        }));
        console.log("UPDATE SUBJECT RECEIVED START MONTH:", req.body.startMonth, "END MONTH:", req.body.endMonth);
        const getMonthVal = (val) => {
            const s = safeStr(val);
            return (s === 'null' || s === 'undefined' || s === '') ? null : s;
        };
        const startMonth = getMonthVal(req.body.startMonth);
        const endMonth = getMonthVal(req.body.endMonth);

        let activeMonths = null;
        if (startMonth && endMonth) {
            const monthsList = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            const startIndex = monthsList.indexOf(startMonth);
            const endIndex = monthsList.indexOf(endMonth);
            if (startIndex !== -1 && endIndex !== -1) {
                if (endIndex >= startIndex) {
                    activeMonths = endIndex - startIndex + 1;
                } else {
                    activeMonths = (12 - startIndex) + endIndex + 1;
                }
            }
        }

        const updatePromises = parsedPrices.map(gp => {
            const existingCourse = gp._existingCourse;
            if (existingCourse) {
                return prisma.course.update({
                    where: { id: existingCourse.id },
                    data: { 
                        name, code, stream, streams: streamsStr, description, lecturerName, 
                        itemOrder: parseInt(itemOrder || 1), price: parseFloat(gp.price || 0), 
                        groupPrices: finalGroupPricesStr, isDiscountExcluded: excludeDiscount,
                        activeMonths, startMonth, endMonth 
                    }
                });
            } else {
                return prisma.course.create({
                    data: { 
                        name, code, stream, streams: streamsStr, description, lecturerName, 
                        itemOrder: parseInt(itemOrder || 1), price: parseFloat(gp.price || 0), 
                        groupPrices: finalGroupPricesStr, groupId: parseInt(gp.groupId), 
                        isDiscountExcluded: excludeDiscount,
                        activeMonths, startMonth, endMonth 
                    }
                });
            }
        });

        await Promise.all(updatePromises);

        if (batch_id) {
            const batchGroups = await prisma.group.findMany({ where: { batchId: parseInt(batch_id) }, select: { id: true } });
            const batchGroupIds = batchGroups.map(g => g.id);
            const allExistingCourses = await prisma.course.findMany({ where: { name: originalCourse.name, groupId: { in: batchGroupIds } } });
            
            const incomingGroupIds = parsedPrices.map(gp => parseInt(gp.groupId));
            const coursesToDelete = allExistingCourses.filter(c => !incomingGroupIds.includes(c.groupId));
            for (const c of coursesToDelete) await prisma.course.delete({ where: { id: c.id } });
        }

        res.status(200).json({ message: "Updated across groups" });
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: "Failed to update subject" }); 
    }
};

exports.deleteSubject = async (req, res) => {
    try {
        await prisma.course.delete({ where: { id: parseInt(req.body.course_id) } });
        res.status(200).json({ message: "Subject Deleted" });
    } catch (e) { res.status(500).json({ error: "Failed to delete subject." }); }
};

exports.assignLecturer = async (req, res) => {
    try {
        const { subjectName, lecturerName } = req.body;
        await prisma.course.updateMany({
            where: { name: subjectName },
            data: { lecturerName }
        });
        res.status(200).json({ message: "Lecturer Assigned Successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to assign lecturer" });
    }
};

// ================= INSTALLMENTS =================
exports.getInstallments = async (req, res) => {
    try {
        const plans = await prisma.installment.findMany({ where: { batchId: parseInt(req.params.batchId) } });
        res.status(200).json(plans);
    } catch (e) { res.status(500).json({ error: "Failed to get installments" }); }
};

exports.deleteInstallment = async (req, res) => {
    try {
        await prisma.installment.delete({ where: { id: parseInt(req.body.plan_id) } });
        res.status(200).json({ message: "Deleted" });
    } catch (e) { res.status(500).json({ error: "Failed to delete installment" }); }
};

exports.createInstallment = async (req, res) => {
    try {
        const { batch_id, subjectCount, installmentsData } = req.body;
        await prisma.installment.create({ data: { batchId: parseInt(batch_id), subjectCount: parseInt(subjectCount), details: JSON.stringify(installmentsData) } });
        res.status(201).json({ message: "Created" });
    } catch (e) { res.status(500).json({ error: "Failed to create installment" }); }
};

exports.updateInstallment = async (req, res) => {
    try {
        const { plan_id, subjectCount, installmentsData } = req.body;
        await prisma.installment.update({
            where: { id: parseInt(plan_id) },
            data: { subjectCount: parseInt(subjectCount), details: JSON.stringify(installmentsData) }
        });
        res.status(200).json({ message: "Updated" });
    } catch (e) { res.status(500).json({ error: "Failed to update installment" }); }
};

// ================= FOLDERS (CONTENT GROUPS) =================
exports.addContentGroup = async (req, res) => {
    try {
        const { title, type, order, batch_id, course_code } = req.body;
        const newFolder = await prisma.contentGroup.create({
            data: { title, type: parseInt(type), itemOrder: parseInt(order) || 1, batchId: parseInt(batch_id), courseCode: course_code === 'NULL' ? null : course_code }
        });
        res.status(201).json({ message: "Folder Created", data: newFolder });
    } catch (e) { res.status(500).json({ error: "Failed to create folder" }); }
};

exports.updateContentGroup = async (req, res) => {
    try {
        const { contentGroupId, title, type, order, course_code } = req.body;
        const updatedFolder = await prisma.contentGroup.update({
            where: { id: parseInt(contentGroupId) },
            data: { title, type: parseInt(type), itemOrder: parseInt(order) || 1, courseCode: course_code === 'NULL' ? null : course_code }
        });
        res.status(200).json({ message: "Folder Updated", data: updatedFolder });
    } catch (e) { console.error(e); res.status(500).json({ error: "Failed to update folder" }); }
};

exports.deleteContentGroup = async (req, res) => {
    try {
        await prisma.contentGroup.delete({ where: { id: parseInt(req.body.contentGroupId) } });
        res.status(200).json({ message: "Folder Deleted" });
    } catch (e) { res.status(500).json({ error: "Failed to delete folder. Delete contents first." }); }
};

// ================= CONTENT & MASS ASSIGN =================
exports.addContentMassAssign = async (req, res) => {
    try {
        console.log("MASS ASSIGN REQ BODY:", req.body);
        const { type, contentGroupId, title, link, zoomMeetingId, date, startTime, endTime, paperTime, questionCount, isFree, selectedCourses, batch_id, itemOrder, youtubeLink, vimeoLink, selectedBatches } = req.body;
        
        let fileName = null;
        let thumbnail = null;

        if (req.files && !Array.isArray(req.files)) {
            if (req.files['file'] && req.files['file'].length > 0) fileName = req.files['file'][0].filename;
            if (req.files['thumbnail'] && req.files['thumbnail'].length > 0) thumbnail = req.files['thumbnail'][0].filename;
        } else if (req.file) {
            fileName = req.file.filename;
        }

        const sanitizedMeetingId = zoomMeetingId ? zoomMeetingId.replace(/\s+/g, '') : null;

        // Process selected batches for Multi-Batch assignment
        let primaryBatchId = parseInt(batch_id);
        let additionalBatchStr = null;
        
        if (selectedBatches) {
            try {
                const batchesArray = JSON.parse(selectedBatches);
                if (batchesArray && batchesArray.length > 0) {
                    // Make sure primary batch is in the array, or just use the first one if not
                    if (!batchesArray.includes(primaryBatchId)) {
                        primaryBatchId = parseInt(batchesArray[0]);
                    }
                    // The rest go into additionalBatchIds (format: ,id1,id2,)
                    const others = batchesArray.filter(id => parseInt(id) !== primaryBatchId);
                    if (others.length > 0) {
                        additionalBatchStr = `,${others.join(',')},`;
                    }
                }
            } catch (err) {
                console.error("Error parsing selectedBatches:", err);
            }
        }

        // 🔥 FIX: මෙතනින් Zoom direct link එක fetch කරලා Database එකට save කරන එක අයින් කළා. 
        // Token එකක් paya 1කින් expire වෙන නිසා DB එකේ save කරලා වැඩක් නෑ. DB crash වෙන එකත් නවතිනවා.
        const data = {
            title, 
            contentType: type, 
            link: link, // Normal Link එක විතරක් save කරනවා
            youtubeLink,
            vimeoLink,
            meetingId: sanitizedMeetingId, 
            fileName, 
            thumbnail, 
            date: date ? new Date(date) : null, 
            startTime, 
            endTime,
            paperTime: paperTime ? parseInt(paperTime) : null, 
            questionCount: questionCount ? parseInt(questionCount) : null,
            isFree: isFree === '1', 
            batchId: primaryBatchId,
            additionalBatchIds: additionalBatchStr,
            courseId: 0,
            itemOrder: parseInt(itemOrder || 1)
        };

        if (contentGroupId && contentGroupId !== 'null' && contentGroupId !== 'undefined' && contentGroupId !== '') {
            data.contentGroupId = parseInt(contentGroupId);
        }

        const newContent = await prisma.content.create({ data });

        if (selectedCourses) {
            const coursesArray = JSON.parse(selectedCourses);
            const contentCourseData = coursesArray.map(cId => ({ content_id: newContent.id, course_id: BigInt(cId), type: getTypeInt(type) }));
            if (contentCourseData.length > 0) await prisma.contentCourse.createMany({ data: contentCourseData });
        }
        res.status(201).json({ message: "Assigned Successfully", data: newContent });
    } catch (e) { 
        console.error(e); 
        res.status(500).json({ error: "Failed to add content" }); 
    }
};

exports.updateContentMassAssign = async (req, res) => {
    try {
        const { content_id, type, contentGroupId, title, link, zoomMeetingId, date, startTime, endTime, paperTime, questionCount, isFree, itemOrder, selectedCourses, youtubeLink, vimeoLink } = req.body;
        
        const sanitizedMeetingId = zoomMeetingId ? zoomMeetingId.replace(/\s+/g, '') : null;

        let updateData = { 
            title, 
            contentType: type, 
            link: link, 
            youtubeLink: youtubeLink || null,
            vimeoLink: vimeoLink || null,
            meetingId: sanitizedMeetingId, 
            date: date ? new Date(date) : null, 
            startTime, 
            endTime, 
            paperTime: paperTime ? parseInt(paperTime) : null, 
            questionCount: questionCount ? parseInt(questionCount) : null, 
            isFree: isFree === '1',
            itemOrder: parseInt(itemOrder || 1)
        };

        if (type === 'live') {
            updateData.reminderSent = false;
        }

        if (contentGroupId && contentGroupId !== 'null' && contentGroupId !== 'undefined' && contentGroupId !== '' && contentGroupId !== '0') {
            updateData.contentGroupId = parseInt(contentGroupId);
        } else {
            updateData.contentGroupId = null;
        }

        if (req.files && !Array.isArray(req.files)) {
            if (req.files['file'] && req.files['file'].length > 0) updateData.fileName = req.files['file'][0].filename;
            if (req.files['thumbnail'] && req.files['thumbnail'].length > 0) updateData.thumbnail = req.files['thumbnail'][0].filename;
        } else if (req.file) {
            updateData.fileName = req.file.filename;
        }

        const updated = await prisma.content.update({ where: { id: parseInt(content_id) }, data: updateData });

        if (selectedCourses) {
            const coursesArray = JSON.parse(selectedCourses);
            await prisma.contentCourse.deleteMany({ where: { content_id: parseInt(content_id) } });
            
            if (coursesArray.length > 0) {
                const contentCourseData = coursesArray.map(cId => ({ 
                    content_id: parseInt(content_id), 
                    course_id: BigInt(cId), 
                    type: getTypeInt(type) 
                }));
                await prisma.contentCourse.createMany({ data: contentCourseData });
            }
        }

        res.status(200).json(updated);
    } catch (e) { 
        console.error(e); 
        res.status(500).json({ error: "Failed to update content" }); 
    }
};

exports.deleteContent = async (req, res) => {
    try {
        const { content_id } = req.body;
        await prisma.content.delete({ where: { id: parseInt(content_id) } });
        await prisma.contentCourse.deleteMany({ where: { content_id: parseInt(content_id) } });
        res.status(200).json({ message: "Deleted" });
    } catch (e) { res.status(500).json({ error: "Failed to delete" }); }
};

exports.getContents = async (req, res) => {
    try {
        const { batchId, courseCode, courseIds } = req.query;
        
        const lessonGroups = await prisma.contentGroup.findMany({
            where: {
                OR: [
                    { batchId: parseInt(batchId) },
                    { additionalBatchIds: { contains: `,${batchId},` } }
                ],
                courseCode: courseCode === 'null' ? null : courseCode
            },
            orderBy: { itemOrder: 'asc' }
        });

        const rawIds = courseIds ? courseIds.split(',') : [req.query.courseId];
        const courseIdArray = rawIds
            .filter(id => id && id !== 'undefined' && id !== 'null' && id.trim() !== '')
            .map(id => BigInt(id));

        const linkedCourses = await prisma.contentCourse.findMany({ where: { course_id: { in: courseIdArray } } });
        const contentIds = linkedCourses.map(lc => lc.content_id);

        const contents = await prisma.content.findMany({
            where: { id: { in: contentIds } },
            orderBy: { createdAt: 'desc' },
            include: { group: true }
        });

        // 🔥 FIX: Content walata assign wela thiyena courses serama pre-populate wenna yawana eka
        const allContentCourses = await prisma.contentCourse.findMany({
            where: { content_id: { in: contentIds } }
        });

        const contentsWithCourses = contents.map(c => {
            const cleanContent = { ...c };
            let finalGroupId = c.contentGroupId;
            let groupTitle = c.group?.title || null;
            delete cleanContent.group;

            return {
                ...cleanContent,
                contentGroupId: finalGroupId,
                groupTitle: groupTitle,
                assignedCourses: allContentCourses.filter(cc => cc.content_id === c.id).map(cc => Number(cc.course_id))
            };
        });

        const safeJson = (data) => JSON.parse(JSON.stringify(data, (k, v) => typeof v === 'bigint' ? v.toString() : v));
        res.status(200).json({ lessonGroups, contents: safeJson(contentsWithCourses) });
    } catch (e) { console.error(e); res.status(500).json({ error: "Failed to fetch contents" }); }
};

// ================= BATCHES FULL DATA =================
exports.getBatchesFull = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const userRole = req.user.role;
        const businessType = req.user.businessType;
        
        const roleUpper = userRole ? userRole.toUpperCase().replace(/ /g, '_') : '';
        const isAdmin = ['SYSTEM_ADMIN', 'DIRECTOR'].includes(roleUpper);
        
        let whereClause = {};
        
        if (!isAdmin) {
            const allBiz = await prisma.business.findMany();
            const userBizList = businessType ? String(businessType).split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : [];
            const myBizs = allBiz.filter(biz => {
                const isManagerOf = (biz.head_manager_id && String(biz.head_manager_id) === String(userId)) ||
                                    (biz.ass_manager_id && String(biz.ass_manager_id) === String(userId));
                const matchesBizType = userBizList.some(b => 
                    b === String(biz.id) ||
                    b === biz.name.toLowerCase().trim() ||
                    biz.name.toLowerCase().trim().includes(b) ||
                    b.includes(biz.name.toLowerCase().trim())
                );
                return isManagerOf || matchesBizType;
            });
            const myBizIds = myBizs.map(b => b.id);
            if (myBizIds.length > 0) {
                whereClause = { businessId: { in: myBizIds } };
            }
        }

        const batches = await prisma.batch.findMany({ 
            where: whereClause,
            include: { 
                business: true, 
                groups: { 
                    include: { courses: true } 
                } 
            } 
        });

        const safeData = JSON.parse(JSON.stringify(batches, (key, value) => typeof value === 'bigint' ? value.toString() : value));
        res.status(200).json(safeData);
    } catch (error) { 
        console.error(error);
        res.status(500).json({ message: "Server Error" }); 
    }
};

// ================= POSTS =================

exports.createAdminPost = async (req, res) => {
    try {
        let { title, description, businessId, batchId } = req.body;
        
        const scopedBizId = await getScopedBusinessId(req.user);
        if (scopedBizId) {
            businessId = scopedBizId; // Force their assigned business
        }

        const finalBizId = (businessId === 'all' || !businessId || businessId === 'null') ? null : BigInt(businessId);
        const finalBatchId = (batchId === 'all' || !batchId || batchId === 'null') ? null : BigInt(batchId);
        
        const fileName = req.file ? req.file.filename : 'default.png';

        // 1. Database එකට Save කරනවා
        const newPost = await prisma.post.create({ 
            data: { 
                title, 
                caption: description, 
                image: fileName, 
                business_id: finalBizId, 
                batch_id: finalBatchId 
            }
        });

        // 2. 🔥 Firebase Cloud Messaging (Push Notification) යවන කොටස 🔥
        try {
            // Default topic එක (හැමෝටම)
            let targetTopic = 'ima_updates';

            // Batch එකක් select කරලා නම් (හිස් string ආවොත් block කරන්න '')
            if (batchId && batchId !== 'all' && batchId !== 'null' && batchId !== 'undefined' && batchId !== '') {
                targetTopic = `batch_${batchId}`; 
            } 
            // Batch එක All වෙලා, Business එකක් select කරලා නම්
            else if (businessId && businessId !== 'all' && businessId !== 'null' && businessId !== 'undefined' && businessId !== '') {
                targetTopic = `business_${businessId}`;
            }

            // Image URL එක හදාගන්නවා
            const imageUrl = fileName !== 'default.png' ? `https://imacampus.online/storage/posts/${fileName}` : null;

            const message = {
                notification: {
                    title: title,
                    body: description
                },
                data: {
                    image_url: imageUrl || '', // මේක App එක ඇතුලෙදි පාවිච්චි කරන්න
                },
                topic: targetTopic 
            };

            // 🔥 FIX: ෆෝන් එකේ උඩින් පේන Notification එකට Image එක දාන කොටස
            if (imageUrl) {
                message.notification.imageUrl = imageUrl; // General
                
                // Android වල ලොකුවට ෆොටෝ එක පේන්න
                message.android = {
                    notification: {
                        imageUrl: imageUrl
                    }
                };
                
                // iOS (Apple) වල ෆොටෝ එක පේන්න
                message.apns = {
                    payload: {
                        aps: {
                            'mutable-content': 1
                        }
                    },
                    fcm_options: {
                        image: imageUrl
                    }
                };
            }

            // 👉 දැන් ඇත්තටම ළමයින්ගේ ෆෝන් වලට Notification එක යවනවා
            await admin.messaging().send(message);
            console.log(`🚀 Push notification sent successfully to topic: ${targetTopic}`);

        } catch (fcmError) {
            console.error("Push notification send error:", fcmError);
        }

        res.status(201).json({ message: "Post Created & Notification Sent Successfully" });
    } catch (e) { 
        console.error("Post Creation Error:", e); 
        res.status(500).json({ error: "Failed to create post" }); 
    }
};

exports.getPosts = async (req, res) => {
    try {
        // ෆ්‍රන්ට්එන්ඩ් එකෙන් එවන businessId එක ගන්නවා
        const { businessId } = req.query;
        
        let whereClause = {};
        const scopedBizId = await getScopedBusinessId(req.user);
        
        if (scopedBizId) {
            whereClause = { business_id: BigInt(scopedBizId) };
        } else if (businessId && businessId !== 'all' && businessId !== 'null') {
            whereClause = {
                OR: [
                    { business_id: BigInt(businessId) }, // ඒ අදාල Business එකේ පෝස්ට්
                    { business_id: null } // 'All' කියලා දාපු පොදු පෝස්ට්
                ]
            };
        }

        const posts = await prisma.post.findMany({ 
            where: whereClause,
            orderBy: { created_at: 'desc' } 
        });
        
        const businesses = await prisma.business.findMany({ select: { id: true, name: true } });
        
        const mappedPosts = posts.map(post => {
            const biz = businesses.find(b => b.id.toString() === post.business_id?.toString());
            return {
                ...post,
                Business: biz ? { name: biz.name } : null
            };
        });

        const safeData = JSON.parse(JSON.stringify(mappedPosts, (key, value) => typeof value === 'bigint' ? value.toString() : value));
        res.status(200).json(safeData);
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: "Failed to get posts" }); 
    }
};

exports.deletePost = async (req, res) => {
    try {
        const scopedBizId = await getScopedBusinessId(req.user);
        const post = await prisma.post.findUnique({ where: { id: parseInt(req.body.post_id) } });
        
        if (!post) return res.status(404).json({ error: "Post not found" });
        if (scopedBizId && post.business_id && post.business_id.toString() !== scopedBizId.toString()) {
            return res.status(403).json({ error: "Unauthorized to delete this post" });
        }

        await prisma.post.delete({ where: { id: parseInt(req.body.post_id) } });
        res.status(200).json({ message: "Post Deleted" });
    } catch (e) { res.status(500).json({ error: "Failed to delete post" }); }
};

// ================= ZOOM DYNAMIC DOWNLOAD (JSON RESPONSE) =================
exports.getZoomDirectMp4Link = getZoomDirectMp4Link;

exports.getZoomDirectLinkJson = async (req, res) => {
    try {
        const rawId = req.params.contentId || req.params.meetingId || req.query.id || req.query.meetingId;
        if (!rawId) return res.status(400).json({ error: "Meeting ID or Content ID is required" });

        let cleanMeetingId = String(rawId).replace(/\s+/g, '');
        console.log(`[DOWNLOAD API] Processing Zoom link request for: "${cleanMeetingId}"`);

        // Check if rawId refers to a database Content ID
        if (/^\d+$/.test(cleanMeetingId) && parseInt(cleanMeetingId) < 100000000) {
            try {
                const content = await prisma.content.findUnique({ where: { id: parseInt(cleanMeetingId) } });
                if (content) {
                    if (content.meetingId && content.meetingId.trim() !== '') {
                        cleanMeetingId = content.meetingId.replace(/\s+/g, '');
                        console.log(`[DOWNLOAD API] Resolved DB Content ID ${rawId} to Meeting ID: ${cleanMeetingId}`);
                    } else if (content.link) {
                        const urlMatch = content.link.match(/(?:zoom\.us\/(?:rec\/share|rec\/play|j)\/)([a-zA-Z0-9_.-]+)/);
                        if (urlMatch && urlMatch[1]) {
                            cleanMeetingId = urlMatch[1];
                            console.log(`[DOWNLOAD API] Extracted Meeting ID from DB Content link: ${cleanMeetingId}`);
                        }
                    }
                }
            } catch (dbErr) {
                console.error("[DOWNLOAD API] DB lookup error:", dbErr.message);
            }
        } else if (cleanMeetingId.includes('zoom.us')) {
            const urlMatch = cleanMeetingId.match(/(?:zoom\.us\/(?:rec\/share|rec\/play|j)\/)([a-zA-Z0-9_.-]+)/);
            if (urlMatch && urlMatch[1]) {
                cleanMeetingId = urlMatch[1];
            }
        }
        
        const directMp4 = await getZoomDirectMp4Link(cleanMeetingId);
        
        if (directMp4) {
            return res.status(200).json({ mp4Link: directMp4 }); 
        } else {
            return res.status(404).json({ error: "Zoom recording direct MP4 not found or expired." });
        }
    } catch (error) {
        console.error("Zoom Fetch Error:", error);
        res.status(500).json({ error: "Server Error" });
    }
};

// Admin App Event Settings
exports.getAppEvent = async (req, res) => {
    try {
        const setting = await prisma.appSetting.findUnique({ where: { key: 'ACTIVE_ANIMATION' } });
        res.status(200).json({ activeEvent: setting ? setting.value : 'none' });
    } catch (error) { res.status(500).json({ error: "Failed to load event" }); }
};

exports.setAppEvent = async (req, res) => {
    try {
        const { eventId } = req.body;
        await prisma.appSetting.upsert({
            where: { key: 'ACTIVE_ANIMATION' },
            update: { value: eventId },
            create: { key: 'ACTIVE_ANIMATION', value: eventId }
        });
        res.status(200).json({ message: "App Animation Updated!" });
    } catch (error) { res.status(500).json({ error: "Failed to update event" }); }
};

exports.getMaintenanceMode = async (req, res) => {
    try {
        const setting = await prisma.appSetting.findUnique({ where: { key: 'MAINTENANCE_MODE' } });
        let valueData = { active: false };
        if (setting) {
            try { valueData = JSON.parse(setting.value); } catch(e) { valueData = { active: setting.value === 'true' }; }
        }
        res.status(200).json(valueData);
    } catch (error) { res.status(500).json({ error: "Failed to load maintenance mode" }); }
};

exports.setMaintenanceMode = async (req, res) => {
    try {
        const { active, messageEn, messageSi } = req.body;
        const valueStr = JSON.stringify({ active, messageEn, messageSi });
        await prisma.appSetting.upsert({
            where: { key: 'MAINTENANCE_MODE' },
            update: { value: valueStr },
            create: { key: 'MAINTENANCE_MODE', value: valueStr }
        });
        res.status(200).json({ message: "Maintenance Mode Updated!" });
    } catch (error) { res.status(500).json({ error: "Failed to update maintenance mode" }); }
};