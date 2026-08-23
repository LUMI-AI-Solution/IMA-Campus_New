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
      include: {
        school: true,
        class: true,
        enrollments: {
          include: { class: true }
        }
      },
      orderBy: { id: 'desc' }
    });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createStudent = async (req, res) => {
  try {
    const { studentName, firstName, lastName, grade, nic, phone, whatsapp, address, gender, dob, schoolId, classId, classIds, guardianName, guardianPhone, guardianWhatsapp, rfid, registrationFeeAmount, registrationFeeStatus } = req.body;
    
    // Generate unique studentId
    const count = await prisma.physicalStudent.count();
    const studentId = `PHY-STU-${1000 + count + 1}`;

    const derivedStudentName = studentName || (firstName || lastName ? `${firstName || ''} ${lastName || ''}`.trim() : '');
    const nameParts = derivedStudentName ? derivedStudentName.split(/\s+/) : ['Student'];
    const finalFirstName = firstName || nameParts[0] || 'Student';
    const finalLastName = lastName || nameParts.slice(1).join(' ') || '';

    // Handle classIds array
    let selectedClassIds = Array.isArray(classIds) ? classIds.map(c => parseInt(c)).filter(Boolean) : [];
    if (classId && !selectedClassIds.includes(parseInt(classId))) {
      selectedClassIds.unshift(parseInt(classId));
    }

    const primaryClassId = selectedClassIds.length > 0 ? selectedClassIds[0] : (classId ? parseInt(classId) : null);

    const student = await prisma.physicalStudent.create({
      data: {
        studentId,
        studentName: derivedStudentName,
        firstName: finalFirstName,
        lastName: finalLastName,
        grade,
        nic,
        phone,
        whatsapp,
        address,
        gender,
        dob,
        schoolId: schoolId ? parseInt(schoolId) : null,
        classId: primaryClassId,
        guardianName,
        guardianPhone,
        guardianWhatsapp,
        rfid: rfid || null,
        registrationFeeAmount: registrationFeeAmount ? parseFloat(registrationFeeAmount) : null,
        registrationFeeStatus: registrationFeeStatus || 'PENDING'
      }
    });

    // Create enrollments for all selected classIds
    if (selectedClassIds.length > 0) {
      await prisma.physicalStudentClassEnrollment.createMany({
        data: selectedClassIds.map(cId => ({
          studentId: student.id,
          classId: cId
        })),
        skipDuplicates: true
      });
    }

    // Refetch student with school, class, and enrollments
    const fullStudent = await prisma.physicalStudent.findUnique({
      where: { id: student.id },
      include: {
        school: true,
        class: true,
        enrollments: { include: { class: true } }
      }
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

    res.status(201).json(fullStudent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentName, firstName, lastName, grade, nic, phone, whatsapp, address, gender, dob, schoolId, classId, classIds, guardianName, guardianPhone, guardianWhatsapp, rfid, registrationFeeAmount, registrationFeeStatus } = req.body;
    
    const oldStudent = await prisma.physicalStudent.findUnique({ where: { id: parseInt(id) }});

    const derivedStudentName = studentName || (firstName || lastName ? `${firstName || ''} ${lastName || ''}`.trim() : '');
    const nameParts = derivedStudentName ? derivedStudentName.split(/\s+/) : ['Student'];
    const finalFirstName = firstName || nameParts[0] || 'Student';
    const finalLastName = lastName || nameParts.slice(1).join(' ') || '';

    // Handle classIds array
    let selectedClassIds = Array.isArray(classIds) ? classIds.map(c => parseInt(c)).filter(Boolean) : [];
    if (classId && !selectedClassIds.includes(parseInt(classId))) {
      selectedClassIds.unshift(parseInt(classId));
    }

    const primaryClassId = selectedClassIds.length > 0 ? selectedClassIds[0] : (classId ? parseInt(classId) : null);

    const student = await prisma.physicalStudent.update({
      where: { id: parseInt(id) },
      data: {
        studentName: derivedStudentName,
        firstName: finalFirstName,
        lastName: finalLastName,
        grade,
        nic,
        phone,
        whatsapp,
        address,
        gender,
        dob,
        schoolId: schoolId ? parseInt(schoolId) : null,
        classId: primaryClassId,
        guardianName,
        guardianPhone,
        guardianWhatsapp,
        rfid: rfid || null,
        registrationFeeAmount: registrationFeeAmount ? parseFloat(registrationFeeAmount) : null,
        registrationFeeStatus: registrationFeeStatus || 'PENDING'
      }
    });

    // Update enrollments if classIds is explicitly passed
    if (Array.isArray(classIds)) {
      await prisma.physicalStudentClassEnrollment.deleteMany({
        where: { studentId: student.id }
      });

      if (selectedClassIds.length > 0) {
        await prisma.physicalStudentClassEnrollment.createMany({
          data: selectedClassIds.map(cId => ({
            studentId: student.id,
            classId: cId
          })),
          skipDuplicates: true
        });
      }
    }

    // Refetch updated student with enrollments
    const fullStudent = await prisma.physicalStudent.findUnique({
      where: { id: student.id },
      include: {
        school: true,
        class: true,
        enrollments: { include: { class: true } }
      }
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

    res.json(fullStudent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const XLSX = require('xlsx');

exports.bulkImportStudents = async (req, res) => {
  try {
    if (!req.file) {
      console.error('[Bulk Excel Import] No file uploaded in request.');
      return res.status(400).json({ error: 'Please select and upload an Excel (.xlsx, .csv) file.' });
    }

    console.log(`[Bulk Excel Import] Processing file: ${req.file.originalname}, Size: ${req.file.size} bytes`);

    let workbook;
    try {
      workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    } catch (readErr) {
      console.error('[Bulk Excel Import] Failed to read Excel workbook:', readErr);
      return res.status(400).json({ error: 'Could not parse Excel file format. Please upload a valid .xlsx or .csv file.' });
    }

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return res.status(400).json({ error: 'The uploaded Excel file contains no worksheets.' });
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert sheet to 2D matrix to find exact header row dynamically
    const rawMatrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (!rawMatrix || rawMatrix.length === 0) {
      return res.status(400).json({ error: 'The uploaded Excel sheet contains no data.' });
    }

    // Dynamic header row detection (scans first 10 rows for column keywords)
    let headerRowIndex = 0;
    const headerKeywords = ['name', 'student', 'phone', 'mobile', 'address', 'gender', 'dob', 'birth', 'parent', 'guardian', 'id_number', 'nic'];

    for (let r = 0; r < Math.min(10, rawMatrix.length); r++) {
      const rowCells = (rawMatrix[r] || []).map(cell => String(cell).toLowerCase().trim());
      const matchCount = rowCells.filter(cell => headerKeywords.some(kw => cell.includes(kw))).length;
      if (matchCount >= 2) {
        headerRowIndex = r;
        break;
      }
    }

    console.log(`[Bulk Excel Import] Detected header row at line ${headerRowIndex + 1}:`, rawMatrix[headerRowIndex]);

    const rawRows = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex, defval: '' });
    if (!rawRows || rawRows.length === 0) {
      return res.status(400).json({ error: 'The uploaded Excel sheet contains no data rows below header.' });
    }

    const { defaultClassId, defaultSchoolId } = req.body;
    const parsedClassId = defaultClassId ? parseInt(defaultClassId) : null;
    const parsedSchoolId = defaultSchoolId ? parseInt(defaultSchoolId) : null;

    // Load existing database students for in-memory matching (Upsert support)
    const existingStudents = await prisma.physicalStudent.findMany();
    const existingByNameMap = new Map();
    const existingByPhoneMap = new Map();

    for (const s of existingStudents) {
      const cleanName = (s.studentName || `${s.firstName || ''} ${s.lastName || ''}`).trim().toLowerCase().replace(/\s+/g, ' ');
      if (cleanName) existingByNameMap.set(cleanName, s);
      if (s.phone) existingByPhoneMap.set(s.phone.trim(), s);
    }

    let currentCount = existingStudents.length;
    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (let idx = 0; idx < rawRows.length; idx++) {
      const row = rawRows[idx];

      // Exact & Permissive Header Key Matcher
      const getValue = (...keys) => {
        for (const k of keys) {
          const target = k.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
          const matchedKey = Object.keys(row).find(rk => {
            const cleanKey = rk.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
            return cleanKey === target || (cleanKey.length > 3 && target.includes(cleanKey)) || (target.length > 3 && cleanKey.includes(target));
          });
          if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) {
            const val = String(row[matchedKey]).trim();
            if (val && val.toLowerCase() !== 'null' && val.toLowerCase() !== 'undefined') {
              return val;
            }
          }
        }
        return '';
      };

      const idNumber = getValue('id_number', 'idnumber', 'nic', 'id');
      let studentName = getValue('student_name', 'studentname', 'name', 'full_name', 'fullname', 'student');
      let phone = getValue('phone_number', 'phonenumber', 'phone', 'mobile', 'mobile_number', 'contact', 'tel');
      const address = getValue('address', 'addr', 'residence');
      const gender = getValue('gender', 'sex');
      const dob = getValue('date_of_birth', 'dateofbirth', 'dob', 'birth_date', 'birthdate');
      const parentName = getValue('parent_name', 'parentname', 'guardian_name', 'guardianname', 'parent');
      let parentMobile = getValue('parent_mobile', 'parentmobile', 'guardian_phone', 'guardianphone', 'parent_phone');

      // Fallback if row is empty
      const nonArrayValues = Object.values(row).map(v => String(v).trim()).filter(v => v && v.toLowerCase() !== 'null' && v.toLowerCase() !== 'undefined');
      if (nonArrayValues.length === 0) {
        skippedCount++;
        continue;
      }

      if (!studentName) {
        const textValue = nonArrayValues.find(v => isNaN(v) && v.length > 2);
        if (textValue) studentName = textValue;
      }

      if (!studentName && !phone && !idNumber) {
        skippedCount++;
        continue;
      }

      if (phone && /^\d{9}$/.test(phone)) {
        phone = '0' + phone;
      }
      if (parentMobile && /^\d{9}$/.test(parentMobile)) {
        parentMobile = '0' + parentMobile;
      }

      const cleanName = studentName ? studentName.trim().toLowerCase().replace(/\s+/g, ' ') : '';
      let existingRecord = cleanName ? existingByNameMap.get(cleanName) : (phone ? existingByPhoneMap.get(phone) : null);

      const nameParts = studentName ? studentName.split(/\s+/) : ['Student'];
      const firstName = nameParts[0] || 'Student';
      const lastName = nameParts.slice(1).join(' ') || '';

      if (existingRecord) {
        // UPDATE existing student record with all detailed fields
        await prisma.physicalStudent.update({
          where: { id: existingRecord.id },
          data: {
            studentName: studentName || existingRecord.studentName,
            firstName: firstName || existingRecord.firstName,
            lastName: lastName || existingRecord.lastName,
            nic: idNumber || existingRecord.nic,
            phone: phone || existingRecord.phone,
            address: address || existingRecord.address,
            gender: gender || existingRecord.gender,
            dob: dob || existingRecord.dob,
            guardianName: parentName || existingRecord.guardianName,
            guardianPhone: parentMobile || existingRecord.guardianPhone,
            classId: parsedClassId || existingRecord.classId,
            schoolId: parsedSchoolId || existingRecord.schoolId
          }
        });
        updatedCount++;
      } else {
        // CREATE new student record
        currentCount++;
        const generatedStudentId = `PHY-STU-${10000 + currentCount}`;
        const newStu = await prisma.physicalStudent.create({
          data: {
            studentId: generatedStudentId,
            studentName: studentName || `${firstName} ${lastName}`.trim(),
            firstName,
            lastName,
            nic: idNumber || null,
            phone: phone || null,
            address: address || null,
            gender: gender || null,
            dob: dob || null,
            guardianName: parentName || null,
            guardianPhone: parentMobile || null,
            classId: parsedClassId,
            schoolId: parsedSchoolId,
            registrationFeeStatus: 'PENDING'
          }
        });
        if (cleanName) existingByNameMap.set(cleanName, newStu);
        if (phone) existingByPhoneMap.set(phone, newStu);
        importedCount++;
      }
    }

    console.log(`[Bulk Excel Import] Upsert Complete! New: ${importedCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}`);

    return res.json({
      success: true,
      importedCount,
      updatedCount,
      skippedCount
    });

  } catch (error) {
    console.error('[Bulk Excel Import Error]:', error);
    return res.status(500).json({ error: 'Bulk import failed: ' + error.message });
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
