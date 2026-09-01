const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const esmsService = require('../services/esmsService');

// Helper: Calculate scheduled class dates in a given month based on timetables
function getScheduledSessionsForClass(classObj, monthStr) {
  if (!monthStr || !monthStr.includes('-')) return 4;
  const [yearStr, mStr] = monthStr.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(mStr) - 1;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const scheduledDaysOfWeek = (classObj.timetables || []).map(t => t.dayOfWeek.toLowerCase());
  if (scheduledDaysOfWeek.length === 0) return 4;

  let count = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const dayName = dayNames[d.getDay()].toLowerCase();
    if (scheduledDaysOfWeek.includes(dayName)) {
      count++;
    }
  }

  return count > 0 ? count : 4;
}

// ============================================================================
// 1. GET COMPREHENSIVE STUDENT REPORTS MATRIX
// ============================================================================
exports.getStudentReports = async (req, res) => {
  try {
    const { classId, schoolId, search, startMonth, endMonth, segment } = req.query;

    const baseWhere = {
      NOT: [
        { studentName: 'id_number' },
        { studentName: 'student_name' },
        { studentName: 'Name' }
      ]
    };

    const whereClause = { ...baseWhere };

    if (schoolId && schoolId !== 'ALL') {
      whereClause.schoolId = parseInt(schoolId);
    }

    if (classId && classId !== 'ALL') {
      const parsedClassId = parseInt(classId);
      whereClause.OR = [
        { classId: parsedClassId },
        { enrollments: { some: { classId: parsedClassId } } }
      ];
    } else if (segment === 'ENROLLED') {
      whereClause.OR = [
        { classId: { not: null } },
        { enrollments: { some: {} } }
      ];
    } else if (segment === 'UNALLOCATED') {
      whereClause.classId = null;
      whereClause.enrollments = { none: {} };
    }

    if (search && search.trim()) {
      const term = search.trim();
      whereClause.AND = [
        ...(whereClause.AND || []),
        {
          OR: [
            { studentName: { contains: term } },
            { firstName: { contains: term } },
            { lastName: { contains: term } },
            { studentId: { contains: term } },
            { phone: { contains: term } },
            { guardianPhone: { contains: term } },
            { rfid: { contains: term } },
            { nic: { contains: term } },
            { school: { name: { contains: term } } }
          ]
        }
      ];
    }

    const [students, globalTotalCount, globalEnrolledCount, allClasses, allSchools, settings] = await Promise.all([
      prisma.physicalStudent.findMany({
        where: whereClause,
        include: {
          school: true,
          class: { include: { timetables: true } },
          enrollments: { include: { class: { include: { timetables: true } } } },
          feePayments: true,
          attendances: { orderBy: { date: 'asc' } }
        },
        orderBy: { id: 'asc' }
      }),
      prisma.physicalStudent.count({ where: baseWhere }),
      prisma.physicalStudent.count({
        where: {
          ...baseWhere,
          OR: [
            { classId: { not: null } },
            { enrollments: { some: {} } }
          ]
        }
      }),
      prisma.physicalClass.findMany({
        include: { teachers: true, timetables: true },
        orderBy: { name: 'asc' }
      }),
      prisma.physicalSchool.findMany({
        orderBy: { name: 'asc' }
      }),
      prisma.physicalCrmSetting.findFirst()
    ]);

    const allMonthsSet = new Set();
    const currentYear = new Date().getFullYear();
    const currentMonthNum = new Date().getMonth() + 1;

    allClasses.forEach(cls => {
      if (Array.isArray(cls.activeMonths) && cls.activeMonths.length > 0) {
        cls.activeMonths.forEach(m => allMonthsSet.add(m));
      }
      if (cls.startMonth) {
        allMonthsSet.add(cls.startMonth);
      }
    });

    students.forEach(s => {
      s.feePayments.forEach(fp => {
        if (fp.month) allMonthsSet.add(fp.month);
      });
      s.attendances.forEach(att => {
        const attMonth = new Date(att.date).toISOString().slice(0, 7);
        allMonthsSet.add(attMonth);
      });
    });

    if (allMonthsSet.size === 0) {
      for (let m = Math.max(1, currentMonthNum - 3); m <= currentMonthNum; m++) {
        allMonthsSet.add(`${currentYear}-${String(m).padStart(2, '0')}`);
      }
    }

    let sortedMonths = Array.from(allMonthsSet).sort();

    if (startMonth && endMonth) {
      sortedMonths = sortedMonths.filter(m => m >= startMonth && m <= endMonth);
    }

    const studentMatrix = students.map(student => {
      const studentName = student.studentName || `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Unnamed Student';

      const enrolledClassesMap = new Map();
      if (student.class) {
        enrolledClassesMap.set(student.class.id, student.class);
      }
      (student.enrollments || []).forEach(e => {
        if (e.class) enrolledClassesMap.set(e.class.id, e.class);
      });

      const enrolledClassesList = Array.from(enrolledClassesMap.values());

      const paymentLookup = {};
      (student.feePayments || []).forEach(p => {
        const key = `${p.classId}_${p.month}`;
        paymentLookup[key] = p;
      });

      const attendanceByMonth = {};
      const attendanceDatesByMonth = {};
      (student.attendances || []).forEach(att => {
        if (att.status === 'PRESENT' || !att.status) {
          const mStr = new Date(att.date).toISOString().slice(0, 7);
          attendanceByMonth[mStr] = (attendanceByMonth[mStr] || 0) + 1;
          if (!attendanceDatesByMonth[mStr]) attendanceDatesByMonth[mStr] = [];
          attendanceDatesByMonth[mStr].push(new Date(att.date).toISOString().slice(0, 10));
        }
      });

      let totalStudentFeesPaid = 0;
      let totalStudentFeesPending = 0;

      const classBreakdown = enrolledClassesList.map(cls => {
        const classMonthsData = sortedMonths.map(month => {
          const pKey = `${cls.id}_${month}`;
          const payment = paymentLookup[pKey] || null;

          const isPaid = payment && (payment.status === 'PAID' || payment.status === 'FREE_CARD');
          const status = payment ? payment.status : 'UNPAID';
          const amountPaid = payment ? (payment.amount || 0) : 0;
          const monthlyFee = cls.monthlyFee || 0;

          if (isPaid) {
            totalStudentFeesPaid += amountPaid || monthlyFee;
          } else {
            totalStudentFeesPending += monthlyFee;
          }

          const scheduledSessions = getScheduledSessionsForClass(cls, month);
          const attendedSessions = attendanceByMonth[month] || 0;
          const attendedDates = attendanceDatesByMonth[month] || [];

          return {
            month,
            monthLabel: formatMonthLabel(month),
            feeStatus: status,
            amountPaid,
            monthlyFee,
            paidDate: payment ? payment.paidDate : null,
            paymentMethod: payment ? payment.paymentMethod : null,
            remark: payment ? payment.remark : null,
            attendedSessions,
            scheduledSessions,
            attendedDates,
            attendanceRate: scheduledSessions > 0 ? Math.min(100, Math.round((attendedSessions / scheduledSessions) * 100)) : 0
          };
        });

        return {
          classId: cls.id,
          className: cls.name,
          grade: cls.grade,
          stream: cls.stream,
          subject: cls.subject,
          monthlyFee: cls.monthlyFee || 0,
          months: classMonthsData
        };
      });

      return {
        id: student.id,
        studentId: student.studentId,
        studentName,
        firstName: student.firstName,
        lastName: student.lastName,
        phone: student.phone,
        whatsapp: student.whatsapp,
        guardianName: student.guardianName,
        guardianPhone: student.guardianPhone,
        guardianWhatsapp: student.guardianWhatsapp,
        nic: student.nic,
        rfid: student.rfid,
        address: student.address,
        gender: student.gender,
        dob: student.dob,
        school: student.school ? { id: student.school.id, name: student.school.name } : null,
        cardType: student.cardType || 'FULL',
        registrationFeeAmount: student.registrationFeeAmount,
        registrationFeeStatus: student.registrationFeeStatus || 'PENDING',
        totalClassesEnrolled: enrolledClassesList.length,
        classes: classBreakdown,
        totalFeesPaid: totalStudentFeesPaid,
        totalFeesPending: totalStudentFeesPending,
        totalAttendanceDays: student.attendances?.length || 0
      };
    });

    studentMatrix.sort((a, b) => {
      if (a.totalClassesEnrolled > 0 && b.totalClassesEnrolled === 0) return -1;
      if (a.totalClassesEnrolled === 0 && b.totalClassesEnrolled > 0) return 1;
      return a.id - b.id;
    });

    const regFeePaidCount = studentMatrix.filter(s => s.registrationFeeStatus === 'PAID').length;
    const totalAttendancesRecorded = studentMatrix.reduce((acc, s) => acc + s.totalAttendanceDays, 0);

    return res.json({
      success: true,
      stats: {
        totalStudents: globalTotalCount,
        enrolledStudentsCount: globalEnrolledCount,
        unallocatedStudentsCount: globalTotalCount - globalEnrolledCount,
        totalEnrollments: studentMatrix.reduce((acc, s) => acc + s.totalClassesEnrolled, 0),
        regFeePaidCount,
        regFeePendingCount: studentMatrix.length - regFeePaidCount,
        totalAttendancesRecorded
      },
      months: sortedMonths.map(m => ({ monthKey: m, label: formatMonthLabel(m) })),
      classes: allClasses.map(c => ({ id: c.id, name: c.name, grade: c.grade, stream: c.stream, subject: c.subject, monthlyFee: c.monthlyFee })),
      schools: allSchools,
      isSmsConfigured: Boolean(settings?.esmsUsername && settings?.esmsPassword),
      isAttendanceSmsEnabled: Boolean(settings?.isAttendanceSmsEnabled),
      students: studentMatrix
    });

  } catch (error) {
    console.error('[Student Reports Controller Error]:', error);
    return res.status(500).json({ error: 'Failed to generate student reports: ' + error.message });
  }
};

// ============================================================================
// 2. GET IN-DEPTH STUDENT FULL DETAILS
// ============================================================================
exports.getStudentFullDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await prisma.physicalStudent.findUnique({
      where: { id: parseInt(id) },
      include: {
        school: true,
        class: { include: { timetables: true, teachers: true } },
        enrollments: { include: { class: { include: { timetables: true, teachers: true } } } },
        feePayments: { include: { class: true }, orderBy: { month: 'desc' } },
        attendances: { orderBy: { date: 'desc' } }
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const smsLogs = await prisma.physicalSmsLog.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return res.json({
      success: true,
      student,
      smsLogs
    });

  } catch (error) {
    console.error('[Student Full Details Error]:', error);
    return res.status(500).json({ error: 'Failed to fetch student details: ' + error.message });
  }
};

// ============================================================================
// 3. SMS GATEWAY SETTINGS & TEST DISPATCH
// ============================================================================
exports.getSmsSettings = async (req, res) => {
  try {
    const settings = await esmsService.getSettings();
    return res.json({ success: true, settings });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load SMS settings: ' + error.message });
  }
};

exports.saveSmsSettings = async (req, res) => {
  try {
    const {
      esmsApiUrl,
      esmsUsername,
      esmsPassword,
      esmsSenderId,
      isAttendanceSmsEnabled,
      attendanceSmsTemplate
    } = req.body;

    const existing = await prisma.physicalCrmSetting.findFirst();

    const data = {
      esmsApiUrl: esmsApiUrl || 'https://esms.dialog.lk/api/sms/send',
      esmsUsername: esmsUsername || '',
      esmsPassword: esmsPassword || '',
      esmsSenderId: esmsSenderId || 'IMACAMPUS',
      isAttendanceSmsEnabled: Boolean(isAttendanceSmsEnabled),
      attendanceSmsTemplate: attendanceSmsTemplate || 'Dear Parent, {student_name} ({student_id}) has attended {class_name} class on {date} at {time}. - IMA Campus'
    };

    let updated;
    if (existing) {
      updated = await prisma.physicalCrmSetting.update({
        where: { id: existing.id },
        data
      });
    } else {
      updated = await prisma.physicalCrmSetting.create({ data });
    }

    return res.json({ success: true, settings: updated, message: 'SMS Settings saved successfully!' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to save SMS settings: ' + error.message });
  }
};

exports.sendTestSms = async (req, res) => {
  try {
    const { phone, message } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Please provide a test phone number.' });
    }
    const result = await esmsService.sendSingleSms({
      phone,
      message: message || 'Test message from IMA Campus Physical CRM Dialog eSMS Gateway Integration.',
      type: 'TEST'
    });
    if (result.success) {
      return res.json({ success: true, message: 'Test SMS sent successfully!' });
    } else {
      return res.status(400).json({ error: result.error || 'Failed to send test SMS via Gateway' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// ============================================================================
// 4. SEND BULK SMS
// ============================================================================
exports.sendBulkSms = async (req, res) => {
  try {
    const { studentIds, classId, message, type } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Please provide a message to send.' });
    }

    const result = await esmsService.sendBulkBroadcast({
      studentIds,
      classId,
      customMessage: message.trim(),
      type: type || 'BULK'
    });

    if (result.success) {
      return res.json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    return res.status(500).json({ error: 'Failed to send bulk SMS: ' + error.message });
  }
};

// ============================================================================
// 5. GET SMS LOGS
// ============================================================================
exports.getSmsLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, type, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (type && type !== 'ALL') where.type = type;
    if (status && status !== 'ALL') where.status = status;

    const [logs, total] = await Promise.all([
      prisma.physicalSmsLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.physicalSmsLog.count({ where })
    ]);

    return res.json({
      success: true,
      logs,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch SMS logs: ' + error.message });
  }
};

function formatMonthLabel(monthStr) {
  if (!monthStr || !monthStr.includes('-')) return monthStr;
  const [y, m] = monthStr.split('-');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const mIdx = parseInt(m) - 1;
  return `${monthNames[mIdx] || m} ${y}`;
}
