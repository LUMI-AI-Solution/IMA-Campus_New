const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// SCHOOLS
exports.getSchools = async (req, res) => {
  try {
    const schools = await prisma.physicalSchool.findMany();
    res.json(schools);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createSchool = async (req, res) => {
  try {
    const { name } = req.body;
    const school = await prisma.physicalSchool.create({
      data: { name },
    });
    res.status(201).json(school);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateSchool = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const school = await prisma.physicalSchool.update({
      where: { id: parseInt(id) },
      data: { name },
    });
    res.json(school);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteSchool = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.physicalSchool.delete({
      where: { id: parseInt(id) },
    });
    res.json({ message: 'School deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// STUDENTS
exports.getStudents = async (req, res) => {
  try {
    const students = await prisma.physicalStudent.findMany({
      include: { school: true, class: true },
      orderBy: { id: 'desc' }
    });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createStudent = async (req, res) => {
  try {
    const { firstName, lastName, grade, nic, phone, whatsapp, address, schoolId, classId, guardianName, guardianPhone, guardianWhatsapp, rfid, registrationFeeAmount, registrationFeeStatus } = req.body;
    
    // Generate unique studentId (simple logic for now, you can enhance it)
    const count = await prisma.physicalStudent.count();
    const studentId = `PHY-STU-${1000 + count + 1}`;

    const student = await prisma.physicalStudent.create({
      data: {
        studentId,
        firstName,
        lastName,
        grade,
        nic,
        phone,
        whatsapp,
        address,
        schoolId: schoolId ? parseInt(schoolId) : null,
        classId: classId ? parseInt(classId) : null,
        guardianName,
        guardianPhone,
        guardianWhatsapp,
        rfid: rfid || null,
        registrationFeeAmount: registrationFeeAmount ? parseFloat(registrationFeeAmount) : null,
        registrationFeeStatus: registrationFeeStatus || 'PENDING'
      },
      include: { school: true, class: true }
    });

    // If fee is PAID, immediately create an INCOME transaction
    if (registrationFeeStatus === 'PAID' && registrationFeeAmount && parseFloat(registrationFeeAmount) > 0) {
      await prisma.physicalTransaction.create({
        data: {
          type: 'INCOME',
          category: 'REGISTRATION',
          amount: parseFloat(registrationFeeAmount),
          description: `Registration Fee - ${student.studentId}`,
          studentId: student.id
        }
      });
    }

    res.status(201).json(student);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, grade, nic, phone, whatsapp, address, schoolId, classId, guardianName, guardianPhone, guardianWhatsapp, rfid, registrationFeeAmount, registrationFeeStatus } = req.body;
    
    // Find old student to see if fee status changed from PENDING to PAID
    const oldStudent = await prisma.physicalStudent.findUnique({ where: { id: parseInt(id) }});

    const student = await prisma.physicalStudent.update({
      where: { id: parseInt(id) },
      data: {
        firstName,
        lastName,
        grade,
        nic,
        phone,
        whatsapp,
        address,
        schoolId: schoolId ? parseInt(schoolId) : null,
        classId: classId ? parseInt(classId) : null,
        guardianName,
        guardianPhone,
        guardianWhatsapp,
        rfid: rfid || null,
        registrationFeeAmount: registrationFeeAmount ? parseFloat(registrationFeeAmount) : null,
        registrationFeeStatus: registrationFeeStatus || 'PENDING'
      },
      include: { school: true, class: true }
    });

    // If it was just updated to PAID, create an INCOME transaction
    if (oldStudent.registrationFeeStatus !== 'PAID' && registrationFeeStatus === 'PAID' && registrationFeeAmount && parseFloat(registrationFeeAmount) > 0) {
      await prisma.physicalTransaction.create({
        data: {
          type: 'INCOME',
          category: 'REGISTRATION',
          amount: parseFloat(registrationFeeAmount),
          description: `Registration Fee - ${student.studentId}`,
          studentId: student.id
        }
      });
    }

    res.json(student);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.physicalStudent.delete({
      where: { id: parseInt(id) },
    });
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// CLASSES
exports.getClasses = async (req, res) => {
  try {
    const classes = await prisma.physicalClass.findMany({
      include: { teachers: true }
    });
    res.json(classes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createClass = async (req, res) => {
  try {
    const { name, grade, stream, subject } = req.body;
    const phyClass = await prisma.physicalClass.create({
      data: { name, grade, stream, subject },
    });
    res.status(201).json(phyClass);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, grade, stream, subject } = req.body;
    const phyClass = await prisma.physicalClass.update({
      where: { id: Number(id) },
      data: { name, grade, stream, subject },
    });
    res.json(phyClass);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteClass = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.physicalClass.delete({
      where: { id: parseInt(id) },
    });
    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// TEACHERS
exports.getTeachers = async (req, res) => {
  try {
    const teachers = await prisma.physicalTeacher.findMany({
      include: { classes: true, timetables: true }
    });
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createTeacher = async (req, res) => {
  try {
    const { name, image, address, whatsapp, phone, classIds, instituteCut, timetables } = req.body;
    
    const teacher = await prisma.physicalTeacher.create({
      data: {
        name,
        image,
        address,
        whatsapp,
        phone,
        instituteCut: instituteCut ? parseFloat(instituteCut) : 0,
        classes: {
          connect: classIds && classIds.length > 0 ? classIds.map(id => ({ id: parseInt(id) })) : []
        },
        timetables: {
          create: timetables || [] // [{ dayOfWeek, startTime, endTime }]
        }
      },
      include: { classes: true, timetables: true }
    });
    res.status(201).json(teacher);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, image, address, whatsapp, phone, classIds, instituteCut, timetables } = req.body;
    
    // Simplest way to update timetables: delete old and create new
    if (timetables) {
        await prisma.physicalTimetable.deleteMany({
            where: { teacherId: parseInt(id) }
        });
    }

    const teacher = await prisma.physicalTeacher.update({
      where: { id: parseInt(id) },
      data: {
        name,
        image,
        address,
        whatsapp,
        phone,
        instituteCut: instituteCut ? parseFloat(instituteCut) : 0,
        classes: {
          set: classIds && classIds.length > 0 ? classIds.map(id => ({ id: parseInt(id) })) : []
        },
        ...(timetables && {
          timetables: {
            create: timetables
          }
        })
      },
      include: { classes: true, timetables: true }
    });
    res.json(teacher);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.physicalTeacher.delete({
      where: { id: parseInt(id) },
    });
    res.json({ message: 'Teacher deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
