const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 🔥 Robust SLT Time Parser (Server Timezone අවුල් සදහටම විසඳන කෑල්ල) 🔥
const parseSLTDate = (dateStr, timeStr = "00:00") => {
    // උදා: dateStr = "2026-05-12", timeStr = "20:00"
    const [year, month, day] = dateStr.split('-').map(Number);
    const timeParts = timeStr.split(':');
    const hours = Number(timeParts[0] || 0);
    const minutes = Number(timeParts[1] || 0);
    
    // ලංකාවේ වෙලාව (SLT) කියන්නේ UTC + 05:30
    // ඒ නිසා අපි පැය 5කුයි විනාඩි 30කුයි අඩු කරලා කෙලින්ම UTC වෙලාව හදලා DB එකට දෙනවා
    return new Date(Date.UTC(year, month - 1, day, hours - 5, minutes - 30, 0));
};

exports.getSchedule = async (req, res) => {
    try {
        const { batchId, businessId, year, month } = req.query;
        // මාසෙ මුල සහ අග ලංකාවේ වෙලාවටම ගන්නවා
        const startDate = parseSLTDate(`${year}-${String(month).padStart(2, '0')}-01`);
        const nextMonth = new Date(Date.UTC(year, month, 0)); 
        const endDate = parseSLTDate(`${year}-${String(month).padStart(2, '0')}-${nextMonth.getUTCDate()}`, "23:59");

        let whereClause = {
            date: {
                gte: startDate,
                lte: endDate,
            }
        };
        if (businessId) whereClause.businessId = parseInt(businessId);
        else if (batchId) whereClause.batchId = parseInt(batchId);

        const schedule = await prisma.timetable.findMany({
            where: whereClause,
            include: { hall: true, batch: true },
            orderBy: { startTime: 'asc' }
        });

        let contentWhereClause = {
            contentType: { in: ['live', '1'] },
            date: {
                gte: startDate,
                lte: endDate,
            }
        };
        if (businessId) {
            const bizBatches = await prisma.batch.findMany({ where: { businessId: parseInt(businessId) } });
            contentWhereClause.batchId = { in: bizBatches.map(b => b.id) };
        } else if (batchId) {
            contentWhereClause.batchId = parseInt(batchId);
        }

        const contentClasses = await prisma.content.findMany({
            where: contentWhereClause,
            include: { group: true }
        });

        // Filter and map Content classes
        // 1. Group by date + startTime to avoid showing multiple payment group instances as duplicates
        // 2. Exclude Content records that overlap with a Timetable record (because they were generated from tasks)
        const uniqueContentClassesMap = new Map();

        contentClasses.forEach(c => {
            // Ignore Content records created without a title (typically those auto-created via tasks)
            // or if you want to include them, we at least deduplicate them.
            // But since Timetable records already show the class, we should only show Content 
            // if there's no Timetable record at the exact same date and time.
            const dateStr = c.date ? new Date(c.date).toISOString().split('T')[0] : '';
            const key = `${c.batchId}_${dateStr}_${c.startTime}`;

            // Check if a Timetable record already exists for this slot
            const hasTimetable = schedule.some(s => {
                const sDateStr = s.date ? new Date(s.date).toISOString().split('T')[0] : '';
                return s.batchId === c.batchId && sDateStr === dateStr && s.startTime === c.startTime;
            });

            if (!hasTimetable && !uniqueContentClassesMap.has(key)) {
                // Determine a meaningful subject name. If c.title is empty, use 'Content Hub Live Class'
                const subjectName = (c.title && c.title.trim() !== '' && c.title !== 'null') ? c.title : 'Content Hub Live Class';
                
                uniqueContentClassesMap.set(key, {
                    id: `content_${c.id}`,
                    businessId: businessId ? parseInt(businessId) : 0,
                    batchId: c.batchId,
                    date: c.date,
                    subjectName: subjectName,
                    title: 'Content Hub Live Class',
                    startTime: c.startTime || '00:00',
                    endTime: c.endTime || '00:00',
                    lecturerName: 'Content Hub',
                    hall: null,
                    deliveryStatus: c.link || c.meetingId ? 'DELIVERED' : 'PENDING',
                    isFromContentHub: true
                });
            }
        });

        const mappedContentClasses = Array.from(uniqueContentClassesMap.values());

        const mergedSchedule = [...schedule, ...mappedContentClasses].sort((a, b) => {
            if (!a.startTime || !b.startTime) return 0;
            return a.startTime.localeCompare(b.startTime);
        });

        res.status(200).json(mergedSchedule);
    } catch (error) {
        res.status(500).json({ error: "Failed to load schedule" });
    }
};

exports.createSchedule = async (req, res) => {
    try {
        const { businessId, batchId, batchIds, date, subjectName, title, startTime, endTime, lecturerName, optionalMCQ, optionalPaper } = req.body;
        
        let primaryBatchId = batchId ? parseInt(batchId) : null;
        let additionalBatchIds = null;

        if (batchIds && Array.isArray(batchIds) && batchIds.length > 0) {
            primaryBatchId = parseInt(batchIds[0]);
            if (batchIds.length > 1) {
                additionalBatchIds = JSON.stringify(batchIds.slice(1).map(id => parseInt(id)));
            }
        }

        const userId = req.user.userId || req.user.id;
        const userRole = req.user.role;
        const businessType = req.user.businessType;
        
        const roleUpper = userRole ? userRole.toUpperCase().replace(/ /g, '_') : '';
        const isAdmin = ['SYSTEM_ADMIN', 'DIRECTOR'].includes(roleUpper);
        
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
            if (!myBizIds.includes(parseInt(businessId))) {
                return res.status(403).json({ error: "Access Denied. You cannot schedule classes for this business." });
            }
        }
        
        if (!primaryBatchId) {
            return res.status(400).json({ error: "At least one batch must be selected." });
        }

        // 100% ක් නිවැරදි ලංකාවේ වෙලාවන් (SLT Timestamps)
        const classDateSLT = parseSLTDate(date, "00:00");
        const classStartDateTime = parseSLTDate(date, startTime);
        const classEndDateTime = parseSLTDate(date, endTime);

        const newClass = await prisma.timetable.create({
            data: {
                businessId: parseInt(businessId),
                batchId: primaryBatchId,
                additionalBatchIds: additionalBatchIds,
                date: classDateSLT,
                subjectName,
                title,
                startTime,
                endTime,
                lecturerName
            }
        });

        // 🔥 1. Default System Timers Generation (හරිම ගණනය කිරීම) 🔥
        const templates = await prisma.taskTemplate.findMany({ where: { businessId: parseInt(businessId) } });
        const tasksToCreate = [];
        
        const defaultTemplates = [
            { taskType: 'LIVE_LINK', isRequired: true, deadlineHours: 1 }, 
            { taskType: 'TECH_DELIVERABLES', isRequired: true, deadlineHours: 2 }, 
            { taskType: 'RECORDING', isRequired: true, deadlineHours: 24 }, 
            { taskType: 'NOTES', isRequired: true, deadlineHours: 24 }      
        ];

        const finalTemplates = defaultTemplates.map(def => {
            const dbTpl = templates.find(t => t.taskType === def.taskType);
            return dbTpl || def; 
        });

        const isMCQ = optionalMCQ === true || optionalMCQ === 'true' || optionalMCQ === '1';
        const isPaper = optionalPaper === true || optionalPaper === 'true' || optionalPaper === '1';

        if (isMCQ) finalTemplates.push(templates.find(t => t.taskType === 'MCQ') || { taskType: 'MCQ', isRequired: true, deadlineHours: 48 });
        if (isPaper) finalTemplates.push(templates.find(t => t.taskType === 'STRUCTURED_PAPER') || { taskType: 'STRUCTURED_PAPER', isRequired: true, deadlineHours: 48 });

        for (const template of finalTemplates) {
            if (template.isRequired) {
                let deadline;
                const hoursInMs = parseFloat(template.deadlineHours || 0) * 60 * 60 * 1000;

                // 🔥 RULES FOR DEADLINES (පන්තියට කලින්ද? පස්සෙද? කියලා බලලා හදනවා) 🔥
                if (['RECORDING', 'MCQ', 'STRUCTURED_PAPER'].includes(template.taskType)) {
                    // පන්තිය ඉවර වුණාට පස්සේ (AFTER End Time)
                    // උදා: පන්තිය 10:00 ට ඉවරයි. පැය 24ක් දුන්නොත් පහුවදා 10:00 වෙනවා.
                    deadline = new Date(classEndDateTime.getTime() + hoursInMs);
                } else {
                    // පන්තිය පටන් ගන්න කලින් (BEFORE Start Time) - Live Links & Notes
                    // උදා: පන්තිය රෑ 8:00 යි. පැය 4ක් දුන්නොත් හවස 4:00 වෙනවා.
                    deadline = new Date(classStartDateTime.getTime() - hoursInMs);
                }

                tasksToCreate.push({ 
                    businessId: parseInt(businessId), 
                    batchId: primaryBatchId, 
                    additionalBatchIds: additionalBatchIds,
                    timetableId: newClass.id, 
                    taskType: template.taskType, 
                    deadline: deadline 
                });
            }
        }
        
        if (tasksToCreate.length > 0) await prisma.task.createMany({ data: tasksToCreate });

        // 🔥 2. AUTO-ALLOCATE CUSTOM TASKS (Linked to Timetable) 🔥
        try {
            const customLinkedTemplates = await prisma.customTaskTemplate.findMany({
                where: { businessId: parseInt(businessId), allocationType: 'CLASS_LINKED' }
            });

            for (const ct of customLinkedTemplates) {
                // Custom Task වල වෙලාවත් SLT වලින්ම හදනවා
                const customDeadline = parseSLTDate(date, ct.endTime);

                const mainCtTask = await prisma.task.create({
                    data: {
                        businessId: parseInt(businessId), batchId: primaryBatchId, additionalBatchIds: additionalBatchIds, timetableId: newClass.id,
                        taskType: "CUSTOM", customTitle: ct.title, customDesc: ct.description,
                        assignedTo: ct.autoAssignTo || null, status: ct.autoAssignTo ? "IN_PROGRESS" : "PENDING",
                        deadline: customDeadline
                    }
                });

                if (ct.subTasks) {
                    const subTasksArray = typeof ct.subTasks === 'string' ? JSON.parse(ct.subTasks) : ct.subTasks;
                    if (Array.isArray(subTasksArray) && subTasksArray.length > 0) {
                        const subsData = subTasksArray.map(sub => ({
                            businessId: parseInt(businessId), batchId: primaryBatchId, additionalBatchIds: additionalBatchIds, timetableId: newClass.id,
                            taskType: "CUSTOM", customTitle: sub.title, parentId: mainCtTask.id,
                            deadline: parseSLTDate(date, sub.endTime), status: "PENDING"
                        }));
                        await prisma.task.createMany({ data: subsData });
                    }
                }
            }
        } catch (err) { console.error("Failed to generate custom class linked tasks", err); }

        res.status(201).json(newClass);
    } catch (error) { 
        console.error("Timetable Creation Error:", error);
        res.status(500).json({ error: "Failed to schedule class" }); 
    }
};

exports.deleteSchedule = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const userRole = req.user.role;
        const businessType = req.user.businessType;
        
        const roleUpper = userRole ? userRole.toUpperCase().replace(/[\s_-]+/g, '_') : '';
        const isAdmin = ['SYSTEM_ADMIN', 'DIRECTOR', 'MANAGER', 'SUPER', 'ASS_MANAGER', 'ADMIN', 'PHYSICAL_MANAGER', 'SOCIAL_MEDIA_MANAGER', 'CALL_CENTER_SUPERVISOR'].includes(roleUpper) || roleUpper.includes('MANAG');
        
        const rawId = String(req.params.id);

        if (rawId.startsWith('content_')) {
            const contentId = parseInt(rawId.replace('content_', ''));
            await prisma.content.delete({ where: { id: contentId } });
            await prisma.contentCourse.deleteMany({ where: { content_id: contentId } });
            return res.status(200).json({ message: "Content class removed from schedule" });
        }

        const scheduleItem = await prisma.timetable.findUnique({ where: { id: parseInt(rawId) } });
        if (!scheduleItem) return res.status(404).json({ error: "Schedule not found" });
        
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
            if (!myBizIds.includes(scheduleItem.businessId)) {
                return res.status(403).json({ error: "Access Denied. You cannot delete schedule items for this business." });
            }
        }

        await prisma.timetable.delete({ where: { id: parseInt(rawId) } });
        res.status(200).json({ message: "Class removed from schedule" });
    } catch (error) {
        console.error("Delete timetable error:", error);
        res.status(500).json({ error: "Failed to delete schedule" });
    }
};