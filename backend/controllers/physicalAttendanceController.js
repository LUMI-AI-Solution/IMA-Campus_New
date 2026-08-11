const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. Scan Student and Load Data
exports.scanStudent = async (req, res) => {
    try {
        const { studentId } = req.params;

        // Fetch student data with class details
        const student = await prisma.physicalStudent.findFirst({
            where: {
                OR: [
                    { studentId: studentId },
                    { rfid: studentId }
                ]
            },
            include: {
                class: true,
                school: true,
            }
        });

        if (!student) {
            return res.status(404).json({ error: 'Student not found for the given Card ID' });
        }

        // Fetch attendance (last 90 days) and available classes concurrently
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);

        const [attendances, availableClasses] = await Promise.all([
            prisma.physicalAttendance.findMany({
                where: {
                    studentId: student.id,
                    date: { gte: threeMonthsAgo }
                },
                orderBy: { date: 'asc' }
            }),
            !student.classId ? prisma.physicalClass.findMany() : Promise.resolve([])
        ]);

        res.json({
            student,
            attendances,
            availableClasses
        });

    } catch (error) {
        console.error('Error scanning student:', error);
        res.status(500).json({ error: 'Failed to fetch student data' });
    }
};

// 2. Allocate Class
exports.allocateClass = async (req, res) => {
    try {
        const { id } = req.params; // PhysicalStudent internal ID
        const { classId } = req.body;

        const updatedStudent = await prisma.physicalStudent.update({
            where: { id: parseInt(id) },
            data: { classId: parseInt(classId) },
            include: { class: true }
        });

        res.json({ success: true, student: updatedStudent });
    } catch (error) {
        console.error('Error allocating class:', error);
        res.status(500).json({ error: 'Failed to allocate class' });
    }
};

// 3. Mark Attendance
exports.markAttendance = async (req, res) => {
    try {
        const { studentId, date } = req.body; 
        
        let normalizedDate;
        if (date.includes('T')) {
            normalizedDate = new Date(date);
            normalizedDate.setUTCHours(0, 0, 0, 0);
        } else {
            normalizedDate = new Date(`${date}T00:00:00.000Z`);
        }

        const attendance = await prisma.physicalAttendance.upsert({
            where: {
                studentId_date: {
                    studentId: parseInt(studentId),
                    date: normalizedDate
                }
            },
            update: {
                status: 'PRESENT'
            },
            create: {
                studentId: parseInt(studentId),
                date: normalizedDate,
                status: 'PRESENT'
            }
        });

        res.json({ success: true, attendance });
    } catch (error) {
        console.error('Error marking attendance:', error);
        res.status(500).json({ error: 'Failed to mark attendance' });
    }
};

// 4. Unmark Attendance
exports.unmarkAttendance = async (req, res) => {
    try {
        const { studentId, date } = req.body; 
        
        let normalizedDate;
        if (date.includes('T')) {
            normalizedDate = new Date(date);
            normalizedDate.setUTCHours(0, 0, 0, 0);
        } else {
            normalizedDate = new Date(`${date}T00:00:00.000Z`);
        }

        await prisma.physicalAttendance.deleteMany({
            where: {
                studentId: parseInt(studentId),
                date: normalizedDate
            }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error unmarking attendance:', error);
        res.status(500).json({ error: 'Failed to unmark attendance' });
    }
};
