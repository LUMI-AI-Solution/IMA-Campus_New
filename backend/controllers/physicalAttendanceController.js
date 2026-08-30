const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const esmsService = require('../services/esmsService');

// 0. Search Students Autocomplete
exports.searchStudents = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query || !query.trim()) {
            return res.json({ students: [] });
        }
        const term = query.trim();
        const students = await prisma.physicalStudent.findMany({
            where: {
                OR: [
                    { studentName: { contains: term } },
                    { firstName: { contains: term } },
                    { lastName: { contains: term } },
                    { studentId: { contains: term } },
                    { phone: { contains: term } },
                    { guardianPhone: { contains: term } },
                    { rfid: { contains: term } },
                    { nic: { contains: term } }
                ]
            },
            include: {
                class: true,
                school: true,
                enrollments: { include: { class: true } }
            },
            take: 20
        });
        res.json({ students });
    } catch (error) {
        console.error('Error in searchStudents:', error);
        res.status(500).json({ error: error.message });
    }
};

// 1. Scan Student and Load Data
exports.scanStudent = async (req, res) => {
    try {
        const { studentId } = req.params;

        // Fetch student data with class details (try exact studentId/rfid first, then name/phone/nic)
        let student = await prisma.physicalStudent.findFirst({
            where: {
                OR: [
                    { studentId: studentId },
                    { rfid: studentId }
                ]
            },
            include: {
                class: true,
                school: true,
                enrollments: { include: { class: true } },
                feePayments: { orderBy: { month: 'desc' } }
            }
        });

        if (!student) {
            student = await prisma.physicalStudent.findFirst({
                where: {
                    OR: [
                        { studentName: { contains: studentId } },
                        { firstName: { contains: studentId } },
                        { lastName: { contains: studentId } },
                        { phone: { contains: studentId } },
                        { nic: { contains: studentId } }
                    ]
                },
                include: {
                    class: true,
                    school: true,
                    enrollments: { include: { class: true } },
                    feePayments: { orderBy: { month: 'desc' } }
                }
            });
        }

        if (!student) {
            return res.status(404).json({ error: 'Student not found for the given Search / Card ID' });
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
            prisma.physicalClass.findMany({ orderBy: { name: 'asc' } })
        ]);

        res.json({
            student,
            attendances,
            availableClasses,
            feePayments: student.feePayments || []
        });

    } catch (error) {
        console.error('Error scanning student:', error);
        res.status(500).json({ error: 'Failed to fetch student data: ' + error.message });
    }
};

// 2. Allocate Class
exports.allocateClass = async (req, res) => {
    try {
        const { id } = req.params;
        const { classId } = req.body;

        const updatedStudent = await prisma.physicalStudent.update({
            where: { id: parseInt(id) },
            data: { classId: parseInt(classId) },
            include: { class: true, enrollments: { include: { class: true } } }
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
        if (date && String(date).includes('T')) {
            normalizedDate = new Date(date);
        } else if (date) {
            normalizedDate = new Date(`${date}T12:00:00.000Z`);
        } else {
            normalizedDate = new Date();
        }

        const student = await prisma.physicalStudent.findUnique({
            where: { id: parseInt(studentId) },
            include: { class: true }
        });

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        // Check if attendance already exists for this exact day (UTC date match)
        const startOfDay = new Date(normalizedDate);
        startOfDay.setUTCHours(0, 0, 0, 0);

        const endOfDay = new Date(normalizedDate);
        endOfDay.setUTCHours(23, 59, 59, 999);

        let attendance = await prisma.physicalAttendance.findFirst({
            where: {
                studentId: parseInt(studentId),
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
        });

        if (!attendance) {
            attendance = await prisma.physicalAttendance.create({
                data: {
                    studentId: parseInt(studentId),
                    date: normalizedDate,
                    status: 'PRESENT'
                }
            });

            // Trigger automated attendance SMS alert via Dialog eSMS Gateway
            esmsService.triggerAttendanceSms({
                student,
                attendanceRecord: attendance,
                classObj: student.class
            }).catch(smsErr => {
                console.error('[Automated Attendance SMS Notification Error]:', smsErr.message);
            });
        }

        res.json({ success: true, attendance });

    } catch (error) {
        console.error('Error marking attendance:', error);
        res.status(500).json({ error: 'Failed to mark attendance: ' + error.message });
    }
};

// 4. Unmark Attendance
exports.unmarkAttendance = async (req, res) => {
    try {
        const { studentId, date } = req.body;

        let normalizedDate;
        if (date && String(date).includes('T')) {
            normalizedDate = new Date(date);
        } else if (date) {
            normalizedDate = new Date(`${date}T12:00:00.000Z`);
        } else {
            normalizedDate = new Date();
        }

        const startOfDay = new Date(normalizedDate);
        startOfDay.setUTCHours(0, 0, 0, 0);

        const endOfDay = new Date(normalizedDate);
        endOfDay.setUTCHours(23, 59, 59, 999);

        await prisma.physicalAttendance.deleteMany({
            where: {
                studentId: parseInt(studentId),
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
        });

        res.json({ success: true, message: 'Attendance unmarked' });
    } catch (error) {
        console.error('Error unmarking attendance:', error);
        res.status(500).json({ error: 'Failed to unmark attendance' });
    }
};

// 5. Get Student Attendance History
exports.getStudentAttendanceHistory = async (req, res) => {
    try {
        const { id } = req.params;

        const attendances = await prisma.physicalAttendance.findMany({
            where: { studentId: parseInt(id) },
            orderBy: { date: 'desc' }
        });

        res.json(attendances);
    } catch (error) {
        console.error('Error fetching attendance history:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
};
