const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getStaffOverview = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, firstName: true, lastName: true, role: true, businessType: true, agentStatus: true }
        });

        if (!user) return res.status(404).json({ error: "User not found" });

        const userRole = String(user.role).toUpperCase().replace(/ /g, '_');
        const isAdmin = ['SYSTEM_ADMIN', 'DIRECTOR', 'SUPER'].includes(userRole);
        const isManager = ['MANAGER', 'ASS_MANAGER'].includes(userRole);

        // 1. Get Assigned Businesses
        let assignedBusinesses = [];
        if (isAdmin) {
            assignedBusinesses = await prisma.business.findMany({
                select: { id: true, name: true, logo: true }
            });
        } else {
            const allBiz = await prisma.business.findMany({
                select: { id: true, name: true, logo: true, head_manager_id: true, ass_manager_id: true }
            });
            
            assignedBusinesses = allBiz.filter(biz => {
                const isManagerOf = biz.head_manager_id === userId || biz.ass_manager_id === userId;
                const matchesBizType = user.businessType && (
                    String(biz.id) === String(user.businessType).trim() ||
                    biz.name.toLowerCase().trim() === String(user.businessType).toLowerCase().trim() ||
                    biz.name.toLowerCase().includes(String(user.businessType).toLowerCase().trim()) ||
                    String(user.businessType).toLowerCase().trim().includes(biz.name.toLowerCase().trim())
                );
                return isManagerOf || matchesBizType;
            }).map(b => ({ id: b.id, name: b.name, logo: b.logo }));
        }

        const businessIds = assignedBusinesses.map(b => b.id);

        // 2. Get Batches for these businesses
        const batches = await prisma.batch.findMany({
            where: { 
                businessId: { in: businessIds },
                is_active: true
            },
            select: { id: true, name: true, businessId: true }
        });
        
        const batchIds = batches.map(b => b.id);

        // 3. Get Active Enrolled Students Count for these batches
        const activeStudentsCount = await prisma.lead.count({
            where: {
                batchId: { in: batchIds },
                enrollmentStatus: 'ENROLLED'
            }
        });

        // 4. Get Upcoming Timetables for these batches (Next 7 days)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);

        const timetables = await prisma.timetable.findMany({
            where: {
                batch_id: { in: batchIds },
                date: {
                    gte: today,
                    lte: nextWeek
                }
            },
            orderBy: {
                date: 'asc'
            },
            take: 10, // Limit to next 10 classes
            include: {
                batch: { select: { name: true } },
                subject: { select: { subject_name: true } }
            }
        });

        const formattedTimetables = timetables.map(t => ({
            id: t.id,
            title: t.title || t.subject?.subject_name || 'Class',
            date: t.date,
            startTime: t.start_time,
            endTime: t.end_time,
            batchName: t.batch?.name,
            type: t.type
        }));

        res.status(200).json({
            agentStatus: user.agentStatus || 'OFFLINE',
            businesses: assignedBusinesses,
            batches: batches,
            activeStudentsCount: activeStudentsCount,
            timetables: formattedTimetables
        });

    } catch (error) {
        console.error("Error in getStaffOverview:", error);
        res.status(500).json({ error: "Failed to load overview data" });
    }
};
