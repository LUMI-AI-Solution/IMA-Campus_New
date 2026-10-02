const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { parseStudentName, extractCallingName } = require('../utils/nameUtils');
const esmsService = require('../services/esmsService');

const saveBase64Image = (imageStr) => {
  if (!imageStr || typeof imageStr !== 'string' || !imageStr.startsWith('data:image')) return imageStr;
  try {
    const match = imageStr.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
    if (!match) return imageStr;
    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    const base64Data = match[2];
    const dir = path.join(__dirname, '../storage/documents');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filename = `teacher_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
    fs.writeFileSync(path.join(dir, filename), Buffer.from(base64Data, 'base64'));
    return `/api/storage/documents/${filename}`;
  } catch (e) {
    console.error("Error saving base64 image:", e);
    return imageStr;
  }
};

// Helper to safely get the next unique Physical Student ID (e.g. PHY-STU-14827)
const getNextPhysicalStudentId = async () => {
  try {
    const result = await prisma.$queryRaw`
      SELECT MAX(CAST(SUBSTRING(studentId, 9) AS UNSIGNED)) as maxId 
      FROM PhysicalStudent 
      WHERE studentId LIKE 'PHY-STU-%'
    `;
    let nextNum = (result && result[0] && result[0].maxId != null) 
      ? Number(result[0].maxId) + 1 
      : 10001;

    // Safety check to ensure no collision
    while (true) {
      const candidate = `PHY-STU-${nextNum}`;
      const existing = await prisma.physicalStudent.findUnique({
        where: { studentId: candidate },
        select: { id: true }
      });
      if (!existing) {
        return candidate;
      }
      nextNum++;
    }
  } catch (err) {
    console.error('Error computing next studentId:', err);
    const count = await prisma.physicalStudent.count();
    let fallbackNum = Math.max(15000, count + 10000 + 1);
    while (true) {
      const candidate = `PHY-STU-${fallbackNum}`;
      const existing = await prisma.physicalStudent.findUnique({
        where: { studentId: candidate },
        select: { id: true }
      });
      if (!existing) {
        return candidate;
      }
      fallbackNum++;
    }
  }
};

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
        class: {
          include: { teachers: true }
        },
        enrollments: {
          include: {
            class: {
              include: { teachers: true }
            }
          }
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
    const { studentName, firstName, lastName, grade, nic, phone, whatsapp, address, gender, dob, schoolId, classId, classIds, guardianName, guardianPhone, guardianWhatsapp, rfid, registrationFeeAmount, registrationFeeStatus, cardType, enrollmentCardTypes, classEnrollments } = req.body;
    
    const trimmedRfid = rfid && typeof rfid === 'string' && rfid.trim().length > 0 ? rfid.trim() : null;

    // Check for duplicate RFID/QR card
    if (trimmedRfid) {
      const existingWithCard = await prisma.physicalStudent.findFirst({
        where: { rfid: trimmedRfid }
      });
      if (existingWithCard) {
        return res.status(400).json({
          error: `Card/QR Code "${trimmedRfid}" is already allocated to "${existingWithCard.studentName || existingWithCard.firstName || existingWithCard.studentId}" (${existingWithCard.studentId})!`
        });
      }
    }

    // Generate unique studentId based on actual highest existing ID
    const studentId = await getNextPhysicalStudentId();

    const derivedStudentName = studentName || (firstName || lastName ? `${firstName || ''} ${lastName || ''}`.trim() : '');
    const parsedName = parseStudentName(derivedStudentName, firstName, lastName);
    const finalFirstName = parsedName.firstName;
    const finalLastName = parsedName.lastName;

    // Handle classIds array
    let selectedClassIds = Array.isArray(classIds) ? classIds.map(c => parseInt(c)).filter(Boolean) : [];
    if (classId && !selectedClassIds.includes(parseInt(classId))) {
      selectedClassIds.unshift(parseInt(classId));
    }

    const primaryClassId = selectedClassIds.length > 0 ? selectedClassIds[0] : (classId ? parseInt(classId) : null);
    const globalCardType = cardType || 'FULL';

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
        rfid: trimmedRfid,
        cardType: globalCardType,
        registrationFeeAmount: registrationFeeAmount ? parseFloat(registrationFeeAmount) : null,
        registrationFeeStatus: registrationFeeStatus || 'PENDING'
      }
    });

    // Build enrollment card type map if passed
    const cardMap = {};
    if (enrollmentCardTypes && typeof enrollmentCardTypes === 'object') {
      Object.keys(enrollmentCardTypes).forEach(k => {
        cardMap[parseInt(k)] = enrollmentCardTypes[k];
      });
    }
    if (Array.isArray(classEnrollments)) {
      classEnrollments.forEach(item => {
        if (item.classId) cardMap[parseInt(item.classId)] = item.cardType || globalCardType;
      });
    }

    // Create enrollments for all selected classIds
    if (selectedClassIds.length > 0) {
      await prisma.physicalStudentClassEnrollment.createMany({
        data: selectedClassIds.map(cId => ({
          studentId: student.id,
          classId: cId,
          cardType: cardMap[cId] || globalCardType
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
    if (registrationFeeStatus === 'PAID') {
      const feeVal = (registrationFeeAmount && parseFloat(registrationFeeAmount) > 0)
        ? parseFloat(registrationFeeAmount)
        : 1000;
      const sName = student.studentName || `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Student';

      await prisma.physicalTransaction.create({
        data: {
          type: 'INCOME',
          category: 'Registration',
          amount: feeVal,
          description: `Registration Fee - ${student.studentId} (${sName})`,
          studentId: student.id
        }
      });
    }

    res.status(201).json(fullStudent);
  } catch (error) {
    if (error.code === 'P2002' && error.meta?.target?.includes('rfid')) {
      return res.status(400).json({ error: 'This Card/RFID is already allocated to another student.' });
    }
    res.status(500).json({ error: error.message });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentName, firstName, lastName, grade, nic, phone, whatsapp, address, gender, dob, schoolId, classId, classIds, guardianName, guardianPhone, guardianWhatsapp, rfid, registrationFeeAmount, registrationFeeStatus, cardType, enrollmentCardTypes, classEnrollments } = req.body;
    
    const oldStudent = await prisma.physicalStudent.findUnique({ where: { id: parseInt(id) }});
    if (!oldStudent) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const trimmedRfid = rfid !== undefined ? (rfid && typeof rfid === 'string' && rfid.trim().length > 0 ? rfid.trim() : null) : oldStudent.rfid;

    // Check for duplicate RFID/QR card on other students
    if (trimmedRfid) {
      const existingWithCard = await prisma.physicalStudent.findFirst({
        where: {
          rfid: trimmedRfid,
          NOT: { id: parseInt(id) }
        }
      });
      if (existingWithCard) {
        return res.status(400).json({
          error: `Card/QR Code "${trimmedRfid}" is already allocated to "${existingWithCard.studentName || existingWithCard.firstName || existingWithCard.studentId}" (${existingWithCard.studentId})!`
        });
      }
    }

    const derivedStudentName = studentName || (firstName || lastName ? `${firstName || ''} ${lastName || ''}`.trim() : '');
    const parsedName = parseStudentName(derivedStudentName, firstName, lastName);
    const finalFirstName = parsedName.firstName;
    const finalLastName = parsedName.lastName;

    // Handle classIds array
    let selectedClassIds = Array.isArray(classIds) ? classIds.map(c => parseInt(c)).filter(Boolean) : [];
    if (classId && !selectedClassIds.includes(parseInt(classId))) {
      selectedClassIds.unshift(parseInt(classId));
    }

    const primaryClassId = selectedClassIds.length > 0 ? selectedClassIds[0] : (classId ? parseInt(classId) : null);
    const globalCardType = cardType !== undefined ? cardType : (oldStudent?.cardType || 'FULL');

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
        rfid: trimmedRfid,
        cardType: globalCardType,
        registrationFeeAmount: registrationFeeAmount ? parseFloat(registrationFeeAmount) : null,
        registrationFeeStatus: registrationFeeStatus || 'PENDING'
      }
    });

    // Build enrollment card type map if passed
    const cardMap = {};
    if (enrollmentCardTypes && typeof enrollmentCardTypes === 'object') {
      Object.keys(enrollmentCardTypes).forEach(k => {
        cardMap[parseInt(k)] = enrollmentCardTypes[k];
      });
    }
    if (Array.isArray(classEnrollments)) {
      classEnrollments.forEach(item => {
        if (item.classId) cardMap[parseInt(item.classId)] = item.cardType || globalCardType;
      });
    }

    // Update enrollments if classIds is explicitly passed
    if (Array.isArray(classIds)) {
      await prisma.physicalStudentClassEnrollment.deleteMany({
        where: { studentId: student.id }
      });

      if (selectedClassIds.length > 0) {
        await prisma.physicalStudentClassEnrollment.createMany({
          data: selectedClassIds.map(cId => ({
            studentId: student.id,
            classId: cId,
            cardType: cardMap[cId] || globalCardType
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
    if (oldStudent && oldStudent.registrationFeeStatus !== 'PAID' && registrationFeeStatus === 'PAID') {
      const feeVal = (registrationFeeAmount && parseFloat(registrationFeeAmount) > 0)
        ? parseFloat(registrationFeeAmount)
        : (oldStudent.registrationFeeAmount && parseFloat(oldStudent.registrationFeeAmount) > 0
          ? parseFloat(oldStudent.registrationFeeAmount)
          : 1000);
      const sName = student.studentName || `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Student';

      await prisma.physicalTransaction.create({
        data: {
          type: 'INCOME',
          category: 'Registration',
          amount: feeVal,
          description: `Registration Fee - ${student.studentId} (${sName})`,
          studentId: student.id
        }
      });
    }

    res.json(fullStudent);
  } catch (error) {
    if (error.code === 'P2002' && error.meta?.target?.includes('rfid')) {
      return res.status(400).json({ error: 'This Card/RFID is already allocated to another student.' });
    }
    res.status(500).json({ error: error.message });
  }
};

// Allocate / Bind Card directly to a student
exports.allocateCard = async (req, res) => {
  try {
    const { id } = req.params;
    const { rfid } = req.body;
    const studentId = parseInt(id);

    if (!studentId) {
      return res.status(400).json({ error: 'Valid student ID is required' });
    }

    const trimmedRfid = rfid && typeof rfid === 'string' && rfid.trim().length > 0 ? rfid.trim() : null;

    if (trimmedRfid) {
      const existingWithCard = await prisma.physicalStudent.findFirst({
        where: {
          rfid: trimmedRfid,
          NOT: { id: studentId }
        }
      });
      if (existingWithCard) {
        return res.status(400).json({
          error: `Card/QR Code "${trimmedRfid}" is already allocated to "${existingWithCard.studentName || existingWithCard.firstName || existingWithCard.studentId}" (${existingWithCard.studentId})!`
        });
      }
    }

    const updatedStudent = await prisma.physicalStudent.update({
      where: { id: studentId },
      data: {
        rfid: trimmedRfid
      },
      include: {
        school: true,
        class: { include: { teachers: true } },
        enrollments: { include: { class: { include: { teachers: true } } } },
        feePayments: { orderBy: { month: 'desc' } }
      }
    });

    res.json({
      success: true,
      message: trimmedRfid ? `Card "${trimmedRfid}" successfully allocated!` : 'Card removed successfully!',
      student: updatedStudent
    });
  } catch (error) {
    console.error('Error allocating card:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('rfid')) {
      return res.status(400).json({ error: 'This Card/RFID is already allocated to another student.' });
    }
    res.status(500).json({ error: 'Failed to allocate card: ' + error.message });
  }
};

const XLSX = require('xlsx');

exports.bulkImportStudents = async (req, res) => {
  try {
    const file = req.file || (req.files && req.files.length > 0 ? req.files[0] : null);
    if (!file) {
      console.error('[Bulk Excel Import] No file uploaded in request.');
      return res.status(400).json({ error: 'Please select and upload an Excel (.xlsx, .csv) file.' });
    }

    let fileBuffer = file.buffer;
    if (!fileBuffer && file.path && fs.existsSync(file.path)) {
      fileBuffer = fs.readFileSync(file.path);
    }
    if (!fileBuffer) {
      return res.status(400).json({ error: 'Could not read uploaded file content.' });
    }

    console.log(`[Bulk Excel Import] Processing file: ${file.originalname || 'unknown'}, Size: ${file.size || fileBuffer.length} bytes`);

    let workbook;
    try {
      workbook = XLSX.read(fileBuffer, { type: 'buffer' });
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

    let nextStudentNum = 10001;
    try {
      const maxRes = await prisma.$queryRaw`
        SELECT MAX(CAST(SUBSTRING(studentId, 9) AS UNSIGNED)) as maxId 
        FROM PhysicalStudent 
        WHERE studentId LIKE 'PHY-STU-%'
      `;
      if (maxRes && maxRes[0] && maxRes[0].maxId != null) {
        nextStudentNum = Number(maxRes[0].maxId) + 1;
      }
    } catch (e) {
      nextStudentNum = Math.max(15000, existingStudents.length + 10000 + 1);
    }
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

      const parsedName = parseStudentName(studentName);
      const firstName = parsedName.firstName;
      const lastName = parsedName.lastName;

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
        const generatedStudentId = `PHY-STU-${nextStudentNum++}`;
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

exports.allocateExcelToClass = async (req, res) => {
  try {
    const file = req.file || (req.files && req.files.length > 0 ? req.files[0] : null);
    if (!file) {
      return res.status(400).json({ error: 'Please upload an Excel file (.xlsx, .xls, .csv).' });
    }

    const { classId, autoCreateUnmatched } = req.body;
    if (!classId) {
      return res.status(400).json({ error: 'Please select a target Class to allocate students to.' });
    }

    const targetClassId = parseInt(classId);
    const targetClass = await prisma.physicalClass.findUnique({
      where: { id: targetClassId },
      include: { teachers: true }
    });

    if (!targetClass) {
      return res.status(404).json({ error: 'Target Class not found in database.' });
    }

    let fileBuffer = file.buffer;
    if (!fileBuffer && file.path && fs.existsSync(file.path)) {
      fileBuffer = fs.readFileSync(file.path);
    }
    if (!fileBuffer) {
      return res.status(400).json({ error: 'Could not read uploaded file content.' });
    }

    let workbook;
    try {
      workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    } catch (readErr) {
      console.error('[Class Allocator] Failed to read Excel workbook:', readErr);
      return res.status(400).json({ error: 'Could not parse Excel file format. Please upload a valid .xlsx or .csv file.' });
    }
    const sheetName = workbook.SheetNames[0];
    const rawRows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

    if (!rawRows || rawRows.length === 0) {
      return res.status(400).json({ error: 'The uploaded Excel sheet is empty.' });
    }

    // Helper: Normalize phone to 9 digits (e.g. 0771234567, 94771234567, 771234567 -> 771234567)
    const normalizePhone = (p) => {
      if (!p) return '';
      const digits = String(p).replace(/\D/g, '');
      if (digits.length >= 9) {
        return digits.slice(-9);
      }
      return digits;
    };

    // Helper: Normalize name
    const normalizeName = (n) => {
      if (!n) return '';
      return String(n)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };

    // Load all existing students with their enrollments
    const existingStudents = await prisma.physicalStudent.findMany({
      include: {
        enrollments: true,
        class: true
      }
    });

    // Build fast lookup maps
    const phoneMap = new Map();
    const nameMap = new Map();

    for (const s of existingStudents) {
      const p1 = normalizePhone(s.phone);
      if (p1) phoneMap.set(p1, s);
      const p2 = normalizePhone(s.guardianPhone);
      if (p2 && !phoneMap.has(p2)) phoneMap.set(p2, s);
      const p3 = normalizePhone(s.whatsapp);
      if (p3 && !phoneMap.has(p3)) phoneMap.set(p3, s);
      const p4 = normalizePhone(s.guardianWhatsapp);
      if (p4 && !phoneMap.has(p4)) phoneMap.set(p4, s);

      const n1 = normalizeName(s.studentName);
      if (n1) nameMap.set(n1, s);
      const n2 = normalizeName(`${s.firstName || ''} ${s.lastName || ''}`);
      if (n2 && !nameMap.has(n2)) nameMap.set(n2, s);
    }

    let nextStudentNum = 10001;
    try {
      const maxRes = await prisma.$queryRaw`
        SELECT MAX(CAST(SUBSTRING(studentId, 9) AS UNSIGNED)) as maxId 
        FROM PhysicalStudent 
        WHERE studentId LIKE 'PHY-STU-%'
      `;
      if (maxRes && maxRes[0] && maxRes[0].maxId != null) {
        nextStudentNum = Number(maxRes[0].maxId) + 1;
      }
    } catch (e) {
      nextStudentNum = Math.max(15000, existingStudents.length + 10000 + 1);
    }
    let matchedCount = 0;
    let allocatedCount = 0;
    let alreadyEnrolledCount = 0;
    let unmatchedCount = 0;
    let autoCreatedCount = 0;

    const allocatedList = [];
    const alreadyEnrolledList = [];
    const unmatchedList = [];

    // Header value extractor
    const getRowValue = (row, ...keys) => {
      for (const k of keys) {
        const target = k.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        const matchedKey = Object.keys(row).find(rk => {
          const cleanKey = rk.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
          return cleanKey === target || (cleanKey.length >= 3 && target.includes(cleanKey)) || (target.length >= 3 && cleanKey.includes(target));
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

    const shouldAutoCreate = autoCreateUnmatched === true || autoCreateUnmatched === 'true';

    for (let idx = 0; idx < rawRows.length; idx++) {
      const row = rawRows[idx];

      const rawName = getRowValue(row, 'student_name', 'studentname', 'name', 'full_name', 'fullname', 'student', 'student name', 'p.name', 'p_name');
      const rawPhone = getRowValue(row, 'p.phone', 'pphone', 'p_phone', 'phone', 'phone_number', 'phonenumber', 'mobile', 'mobile_number', 'contact', 'parent_phone', 'parent_mobile', 'guardian_phone', 'tel');
      const rawNic = getRowValue(row, 'id_number', 'idnumber', 'nic', 'id', 'student_id');

      // Skip row if completely blank
      if (!rawName && !rawPhone && !rawNic) {
        continue;
      }

      const normP = normalizePhone(rawPhone);
      const normN = normalizeName(rawName);

      let matchedStudent = null;
      if (normP && phoneMap.has(normP)) {
        matchedStudent = phoneMap.get(normP);
      } else if (normN && nameMap.has(normN)) {
        matchedStudent = nameMap.get(normN);
      }

      if (matchedStudent) {
        matchedCount++;

        // Check if student is already enrolled in this class
        const isAlreadyEnrolled = 
          matchedStudent.classId === targetClassId || 
          (matchedStudent.enrollments && matchedStudent.enrollments.some(e => e.classId === targetClassId));

        if (isAlreadyEnrolled) {
          alreadyEnrolledCount++;
          alreadyEnrolledList.push({
            id: matchedStudent.id,
            studentId: matchedStudent.studentId,
            studentName: matchedStudent.studentName,
            phone: matchedStudent.phone || rawPhone,
            guardianPhone: matchedStudent.guardianPhone,
            excelName: rawName,
            excelPhone: rawPhone
          });
        } else {
          // Allocate student to this class
          if (!matchedStudent.classId) {
            await prisma.physicalStudent.update({
              where: { id: matchedStudent.id },
              data: { classId: targetClassId }
            });
            matchedStudent.classId = targetClassId;
          }

          // Create enrollment in PhysicalStudentClassEnrollment
          await prisma.physicalStudentClassEnrollment.upsert({
            where: {
              studentId_classId: {
                studentId: matchedStudent.id,
                classId: targetClassId
              }
            },
            create: {
              studentId: matchedStudent.id,
              classId: targetClassId
            },
            update: {}
          });

          if (!matchedStudent.enrollments) matchedStudent.enrollments = [];
          matchedStudent.enrollments.push({ classId: targetClassId });

          allocatedCount++;
          allocatedList.push({
            id: matchedStudent.id,
            studentId: matchedStudent.studentId,
            studentName: matchedStudent.studentName,
            phone: matchedStudent.phone || rawPhone,
            guardianPhone: matchedStudent.guardianPhone,
            excelName: rawName,
            excelPhone: rawPhone
          });
        }
      } else {
        if (shouldAutoCreate && (rawName || rawPhone)) {
          const parsedName = parseStudentName(rawName);
          const firstName = parsedName.firstName;
          const lastName = parsedName.lastName;
          let formattedPhone = rawPhone;
          if (formattedPhone && /^\d{9}$/.test(formattedPhone)) {
            formattedPhone = '0' + formattedPhone;
          }

          const generatedStudentId = `PHY-STU-${nextStudentNum++}`;
          const newStu = await prisma.physicalStudent.create({
            data: {
              studentId: generatedStudentId,
              studentName: rawName || `${firstName} ${lastName}`.trim(),
              firstName,
              lastName,
              phone: formattedPhone || null,
              guardianPhone: formattedPhone || null,
              classId: targetClassId,
              registrationFeeStatus: 'PENDING',
              enrollments: {
                create: { classId: targetClassId }
              }
            }
          });

          if (normP) phoneMap.set(normP, newStu);
          if (normN) nameMap.set(normN, newStu);

          autoCreatedCount++;
          allocatedCount++;
          allocatedList.push({
            id: newStu.id,
            studentId: newStu.studentId,
            studentName: newStu.studentName,
            phone: newStu.phone,
            excelName: rawName,
            excelPhone: rawPhone,
            isNew: true
          });
        } else {
          unmatchedCount++;
          unmatchedList.push({
            rowIdx: idx + 1,
            name: rawName || 'No Name',
            phone: rawPhone || 'No Phone'
          });
        }
      }
    }

    return res.json({
      success: true,
      totalInExcel: rawRows.length,
      matchedCount,
      allocatedCount,
      alreadyEnrolledCount,
      unmatchedCount,
      autoCreatedCount,
      targetClass: {
        id: targetClass.id,
        name: targetClass.name,
        grade: targetClass.grade,
        stream: targetClass.stream,
        subject: targetClass.subject,
        teachers: targetClass.teachers || []
      },
      allocatedList,
      alreadyEnrolledList,
      unmatchedList
    });

  } catch (error) {
    console.error('[Allocate Excel To Class Error]:', error);
    return res.status(500).json({ error: 'Failed to allocate students: ' + error.message });
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
      include: { 
        teachers: true, 
        timetables: { 
          include: { hall: true } 
        } 
      },
      orderBy: { id: 'desc' }
    });
    res.json(classes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createClass = async (req, res) => {
  try {
    const { name, grade, stream, subject, monthlyFee, fee, startMonth, activeMonths, timetables } = req.body;
    const feeVal = monthlyFee !== undefined && monthlyFee !== null && monthlyFee !== ''
      ? parseFloat(monthlyFee)
      : (fee !== undefined && fee !== null && fee !== '' ? parseFloat(fee) : 0);

    let parsedActiveMonths = activeMonths;
    if (typeof activeMonths === 'string') {
      try { parsedActiveMonths = JSON.parse(activeMonths); } catch (e) { parsedActiveMonths = [activeMonths]; }
    }

    const phyClass = await prisma.physicalClass.create({
      data: {
        name,
        grade,
        stream,
        subject,
        monthlyFee: isNaN(feeVal) ? 0 : feeVal,
        startMonth: startMonth || null,
        activeMonths: parsedActiveMonths || (startMonth ? [startMonth] : null),
        ...(timetables && timetables.length > 0 && {
          timetables: {
            create: timetables.map(t => ({
              dayOfWeek: t.dayOfWeek,
              startTime: t.startTime,
              endTime: t.endTime,
              hallId: t.hallId ? parseInt(t.hallId) : null,
              hallName: t.hallName || (t.hall ? t.hall.name : null) || null
            }))
          }
        })
      },
      include: { teachers: true, timetables: { include: { hall: true } } }
    });
    res.status(201).json(phyClass);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, grade, stream, subject, monthlyFee, fee, startMonth, activeMonths, timetables } = req.body;
    const feeVal = monthlyFee !== undefined && monthlyFee !== null && monthlyFee !== ''
      ? parseFloat(monthlyFee)
      : (fee !== undefined && fee !== null && fee !== '' ? parseFloat(fee) : 0);

    let parsedActiveMonths = activeMonths;
    if (typeof activeMonths === 'string') {
      try { parsedActiveMonths = JSON.parse(activeMonths); } catch (e) { parsedActiveMonths = [activeMonths]; }
    }

    if (timetables) {
      await prisma.physicalTimetable.deleteMany({
        where: { classId: parseInt(id) }
      });
    }

    const phyClass = await prisma.physicalClass.update({
      where: { id: Number(id) },
      data: {
        name,
        grade,
        stream,
        subject,
        monthlyFee: isNaN(feeVal) ? 0 : feeVal,
        startMonth: startMonth !== undefined ? startMonth : undefined,
        activeMonths: parsedActiveMonths !== undefined ? parsedActiveMonths : undefined,
        ...(timetables && {
          timetables: {
            create: timetables.map(t => ({
              dayOfWeek: t.dayOfWeek,
              startTime: t.startTime,
              endTime: t.endTime,
              hallId: t.hallId ? parseInt(t.hallId) : null,
              hallName: t.hallName || (t.hall ? t.hall.name : null) || null
            }))
          }
        })
      },
      include: { teachers: true, timetables: { include: { hall: true } } }
    });
    res.json(phyClass);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// HALLS
exports.getHalls = async (req, res) => {
  try {
    const halls = await prisma.hall.findMany({
      orderBy: { id: 'asc' }
    });
    res.json(halls);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createHall = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Hall name is required' });
    const hall = await prisma.hall.create({
      data: { name: name.trim() }
    });
    res.status(201).json(hall);
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
      include: {
        classes: {
          include: { timetables: { include: { hall: true } } }
        },
        timetables: { include: { hall: true } }
      },
      orderBy: { id: 'desc' }
    });
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createTeacher = async (req, res) => {
  try {
    const { name, image, address, whatsapp, phone, classIds, instituteCut, timetables } = req.body;
    const processedImage = saveBase64Image(image);
    
    const teacher = await prisma.physicalTeacher.create({
      data: {
        name,
        image: processedImage,
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
    const processedImage = saveBase64Image(image);
    
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
        image: processedImage,
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

// --- CLASS FEE MATRIX & PAYMENT MANAGEMENT ---
exports.getClassFeeMatrix = async (req, res) => {
  try {
    const { classId } = req.params;
    const clsId = parseInt(classId);

    const phyClass = await prisma.physicalClass.findUnique({
      where: { id: clsId },
      include: {
        teachers: true,
        timetables: true
      }
    });

    if (!phyClass) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Get all students enrolled in this class
    const enrollments = await prisma.physicalStudentClassEnrollment.findMany({
      where: { classId: clsId },
      include: {
        student: {
          include: {
            school: true
          }
        }
      }
    });

    // Also include students who have this class as their primary classId
    const primaryStudents = await prisma.physicalStudent.findMany({
      where: {
        classId: clsId,
        id: { notIn: enrollments.map(e => e.studentId) }
      },
      include: { school: true }
    });

    const allStudents = [
      ...enrollments.map(e => e.student),
      ...primaryStudents
    ].filter(Boolean);

    // Sort students by name
    allStudents.sort((a, b) => {
      const nameA = (a.studentName || `${a.firstName || ''} ${a.lastName || ''}`).toLowerCase();
      const nameB = (b.studentName || `${b.firstName || ''} ${b.lastName || ''}`).toLowerCase();
      return nameA.localeCompare(nameB);
    });

    // Get all fee payments recorded for this class
    const payments = await prisma.physicalClassFeePayment.findMany({
      where: { classId: clsId }
    });

    // Parse active months
    let activeMonths = [];
    if (Array.isArray(phyClass.activeMonths)) {
      activeMonths = phyClass.activeMonths;
    } else if (typeof phyClass.activeMonths === 'string') {
      try { activeMonths = JSON.parse(phyClass.activeMonths); } catch (e) { activeMonths = [phyClass.activeMonths]; }
    } else if (phyClass.startMonth) {
      activeMonths = [phyClass.startMonth];
    }

    // If still empty, default to current month
    if (activeMonths.length === 0) {
      const now = new Date();
      activeMonths = [`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`];
    }

    // Map payments by `${studentId}_${month}`
    const paymentMap = new Map();
    payments.forEach(p => {
      paymentMap.set(`${p.studentId}_${p.month}`, p);
    });

    // Monthly summary stats
    const monthlySummary = {};
    activeMonths.forEach(m => {
      monthlySummary[m] = {
        month: m,
        totalEnrolled: allStudents.length,
        paidCount: 0,
        unpaidCount: 0,
        freeCount: 0,
        grossAmount: 0,
        expectedGross: (allStudents.length * (phyClass.monthlyFee || 0))
      };
    });

    // Format students with their month breakdown
    const studentsWithMonths = allStudents.map(student => {
      const monthsData = {};
      let totalPaidForStudent = 0;
      let totalPendingForStudent = 0;

      activeMonths.forEach(m => {
        const pay = paymentMap.get(`${student.id}_${m}`);
        if (pay && pay.status === 'PAID') {
          monthsData[m] = {
            status: 'PAID',
            amount: pay.amount || phyClass.monthlyFee || 0,
            paidDate: pay.paidDate,
            paymentMethod: pay.paymentMethod,
            id: pay.id
          };
          totalPaidForStudent++;
          if (monthlySummary[m]) {
            monthlySummary[m].paidCount++;
            monthlySummary[m].grossAmount += (pay.amount || phyClass.monthlyFee || 0);
          }
        } else if (pay && pay.status === 'FREE_CARD') {
          monthsData[m] = {
            status: 'FREE_CARD',
            amount: 0,
            paidDate: pay.paidDate,
            id: pay.id
          };
          if (monthlySummary[m]) {
            monthlySummary[m].freeCount++;
          }
        } else {
          monthsData[m] = {
            status: 'PENDING',
            amount: phyClass.monthlyFee || 0,
            paidDate: null,
            id: pay ? pay.id : null
          };
          totalPendingForStudent++;
          if (monthlySummary[m]) {
            monthlySummary[m].unpaidCount++;
          }
        }
      });

      return {
        id: student.id,
        studentId: student.studentId,
        studentName: student.studentName || `${student.firstName || ''} ${student.lastName || ''}`.trim(),
        firstName: student.firstName,
        lastName: student.lastName,
        phone: student.phone,
        whatsapp: student.whatsapp,
        guardianName: student.guardianName,
        guardianPhone: student.guardianPhone,
        school: student.school ? student.school.name : null,
        registrationFeeStatus: student.registrationFeeStatus || 'PENDING',
        registrationFeeAmount: student.registrationFeeAmount || 1000,
        months: monthsData,
        totalPaidMonths: totalPaidForStudent,
        totalPendingMonths: totalPendingForStudent
      };
    });

    res.json({
      class: {
        id: phyClass.id,
        name: phyClass.name,
        grade: phyClass.grade,
        stream: phyClass.stream,
        subject: phyClass.subject,
        monthlyFee: phyClass.monthlyFee || 0,
        startMonth: phyClass.startMonth,
        activeMonths,
        teachers: phyClass.teachers,
        timetables: phyClass.timetables
      },
      activeMonths,
      monthlySummary,
      totalStudents: allStudents.length,
      students: studentsWithMonths
    });

  } catch (error) {
    console.error('Error fetching class fee matrix:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.toggleStudentFeePayment = async (req, res) => {
  try {
    const { studentId, classId, month, status, amount, isIncremental, paymentMethod, remark } = req.body;

    if (!studentId || !classId || !month) {
      return res.status(400).json({ error: 'studentId, classId, and month are required' });
    }

    const sId = parseInt(studentId);
    const cId = parseInt(classId);
    const targetStatus = (status || 'PAID').toUpperCase();

    const targetClass = await prisma.physicalClass.findUnique({
      where: { id: cId }
    });

    const targetStudent = await prisma.physicalStudent.findUnique({
      where: { id: sId }
    });

    if (!targetClass || !targetStudent) {
      return res.status(404).json({ error: 'Student or Class not found' });
    }

    // Check enrollment specific cardType or student default cardType
    const enrollment = await prisma.physicalStudentClassEnrollment.findUnique({
      where: {
        studentId_classId: {
          studentId: sId,
          classId: cId
        }
      }
    });

    const effectiveCardType = enrollment?.cardType || targetStudent.cardType || 'FULL';

    // Calculate full expected fee based on card type
    let expectedFee = 0;
    if (effectiveCardType === 'FREE') {
      expectedFee = 0;
    } else if (effectiveCardType === 'HALF') {
      expectedFee = (targetClass.monthlyFee || 0) / 2;
    } else {
      expectedFee = targetClass.monthlyFee || 0;
    }

    if (targetStatus === 'PENDING' || targetStatus === 'UNPAID') {
      // Remove payment record or set status PENDING
      await prisma.physicalClassFeePayment.deleteMany({
        where: {
          studentId: sId,
          classId: cId,
          month
        }
      });

      // Soft-delete corresponding Cash Flow transaction so cash balance stays 100% accurate
      await prisma.physicalTransaction.updateMany({
        where: {
          studentId: sId,
          category: 'Class Fee',
          description: { contains: month },
          isDeleted: false
        },
        data: {
          isDeleted: true,
          deletedReason: `Payment for ${month} marked Pending / Cancelled`,
          deletedAt: new Date(),
          deletedBy: 'Staff / Attendance Portal'
        }
      });

      return res.json({
        success: true,
        status: 'PENDING',
        paidAmount: 0,
        dueAmount: expectedFee,
        expectedFee,
        message: `Payment for ${month} marked as PENDING`
      });
    }

    // Find existing payment record to compute incremental amount if any
    const existingPayment = await prisma.physicalClassFeePayment.findUnique({
      where: {
        studentId_classId_month: {
          studentId: sId,
          classId: cId,
          month
        }
      }
    });

    // If class fee is already fully paid for this month, lock it against duplicate payments
    const isAlreadyFullyPaid = existingPayment && 
      (existingPayment.status === 'PAID' || existingPayment.status === 'FREE_CARD' || existingPayment.status === 'HALF_PAYMENT') &&
      ((existingPayment.amount || 0) >= expectedFee || effectiveCardType === 'FREE');

    if (isAlreadyFullyPaid && targetStatus !== 'PENDING' && targetStatus !== 'UNPAID' && !isIncremental && (amount === undefined || amount === null || amount === '')) {
      return res.status(400).json({
        error: `Class fee for ${month} is already fully paid. To adjust the amount, please enter a custom amount or mark as unpaid.`,
        payment: existingPayment
      });
    }

    let paidAmount = 0;
    if (amount !== undefined && amount !== null && amount !== '') {
      const inputAmount = parseFloat(amount);
      if (isIncremental && existingPayment) {
        paidAmount = (existingPayment.amount || 0) + inputAmount;
      } else {
        paidAmount = inputAmount;
      }
    } else {
      paidAmount = expectedFee;
    }

    let finalStatus = 'PAID';
    if (effectiveCardType === 'FREE') {
      finalStatus = 'FREE_CARD';
      paidAmount = 0;
    } else if (effectiveCardType === 'HALF') {
      if (paidAmount >= expectedFee) {
        finalStatus = 'HALF_PAYMENT';
      } else if (paidAmount > 0) {
        finalStatus = 'PARTIAL';
      } else {
        finalStatus = 'PENDING';
      }
    } else if (paidAmount >= expectedFee) {
      finalStatus = 'PAID';
    } else if (paidAmount > 0 && paidAmount < expectedFee) {
      finalStatus = 'PARTIAL';
    } else {
      finalStatus = 'PENDING';
    }

    const dueAmount = Math.max(0, expectedFee - paidAmount);

    // Upsert payment record
    const payment = await prisma.physicalClassFeePayment.upsert({
      where: {
        studentId_classId_month: {
          studentId: sId,
          classId: cId,
          month
        }
      },
      update: {
        status: finalStatus,
        amount: paidAmount,
        paidDate: new Date(),
        paymentMethod: paymentMethod || 'CASH',
        remark: remark || null
      },
      create: {
        studentId: sId,
        classId: cId,
        month,
        status: finalStatus,
        amount: paidAmount,
        paidDate: new Date(),
        paymentMethod: paymentMethod || 'CASH',
        remark: remark || null
      }
    });

    // Compute delta amount for PhysicalTransaction cash flow
    const previousAmount = existingPayment ? (existingPayment.amount || 0) : 0;
    const deltaAmount = Math.max(0, paidAmount - previousAmount);

    let transaction = null;
    const sName = targetStudent.studentName || `${targetStudent.firstName || ''} ${targetStudent.lastName || ''}`.trim() || 'Student';

    if (deltaAmount > 0) {
      const transDesc = finalStatus === 'PARTIAL'
        ? `Class Fee Partial (${month}) - ${targetClass.name} - ${targetStudent.studentId} (${sName}) [Paid: Rs. ${paidAmount.toLocaleString()} / Total: Rs. ${expectedFee.toLocaleString()} (Due: Rs. ${dueAmount.toLocaleString()})]`
        : `Class Fee (${month}) - ${targetClass.name} - ${targetStudent.studentId} (${sName}) [${effectiveCardType} CARD]`;

      transaction = await prisma.physicalTransaction.create({
        data: {
          type: 'INCOME',
          category: 'Class Fee',
          amount: deltaAmount,
          description: transDesc,
          studentId: sId,
          isDeleted: false
        }
      });
    }

    const receiptNo = transaction ? `REC-${transaction.id}` : `CF-${payment.id}`;

    // Trigger automated fee payment SMS notification
    if (deltaAmount > 0 || paidAmount > 0) {
      esmsService.triggerFeePaymentSms({
        student: targetStudent,
        studentId: sId,
        paidAmount: deltaAmount > 0 ? deltaAmount : paidAmount,
        expectedFee,
        dueAmount,
        month,
        className: targetClass.name,
        classNames: [targetClass.name],
        receiptNo,
        paymentMethod: paymentMethod || 'CASH',
        cardType: effectiveCardType,
        isBulk: false
      }).catch(smsErr => {
        console.error('[Automated Fee Payment SMS Error]:', smsErr.message);
      });
    }

    res.json({
      success: true,
      payment,
      transaction,
      expectedFee,
      paidAmount,
      dueAmount,
      status: finalStatus,
      receiptData: {
        receiptNo: transaction ? `REC-${transaction.id}` : `CF-${payment.id}`,
        studentId: targetStudent.studentId,
        studentName: sName,
        guardianPhone: targetStudent.guardianPhone || targetStudent.phone || '',
        className: targetClass.name,
        month,
        cardType: effectiveCardType,
        amount: paidAmount,
        deltaAmount: deltaAmount > 0 ? deltaAmount : paidAmount,
        expectedFee,
        dueAmount,
        paymentMethod: paymentMethod || 'CASH',
        paidDate: payment.paidDate || new Date(),
        status: finalStatus,
        items: [
          {
            description: `Class Fee - ${targetClass.name}`,
            month,
            cardType: `${effectiveCardType} CARD`,
            amount: paidAmount,
            expectedFee,
            dueAmount
          }
        ],
        totalAmount: paidAmount
      },
      message: `Payment for ${month} saved successfully as ${finalStatus}!`
    });

  } catch (error) {
    console.error('Error toggling fee payment:', error);
    res.status(500).json({ error: error.message });
  }
};

// --- BULK MULTI-CLASS FEE PAYMENT & CONSOLIDATED RECEIPT ---
exports.bulkStudentFeePayment = async (req, res) => {
  try {
    const { studentId, month, paymentMethod = 'CASH', remark, payments } = req.body;

    if (!studentId || !month) {
      return res.status(400).json({ error: 'studentId and month are required' });
    }

    const sId = parseInt(studentId);
    const targetStudent = await prisma.physicalStudent.findUnique({
      where: { id: sId },
      include: {
        enrollments: {
          include: { class: true }
        },
        class: true
      }
    });

    if (!targetStudent) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const sName = targetStudent.studentName || `${targetStudent.firstName || ''} ${targetStudent.lastName || ''}`.trim() || 'Student';

    // If payments array is provided, use it; otherwise, collect all enrolled classes
    let itemsToProcess = [];
    if (Array.isArray(payments) && payments.length > 0) {
      itemsToProcess = payments;
    } else {
      const classMap = new Map();
      if (targetStudent.class) {
        classMap.set(targetStudent.class.id, {
          classId: targetStudent.class.id,
          cardType: targetStudent.cardType || 'FULL',
          monthlyFee: targetStudent.class.monthlyFee || 0,
          class: targetStudent.class
        });
      }
      if (targetStudent.enrollments) {
        targetStudent.enrollments.forEach(e => {
          if (e.class) {
            classMap.set(e.class.id, {
              classId: e.class.id,
              cardType: e.cardType || targetStudent.cardType || 'FULL',
              monthlyFee: e.class.monthlyFee || 0,
              class: e.class
            });
          }
        });
      }
      itemsToProcess = Array.from(classMap.values());
    }

    if (itemsToProcess.length === 0) {
      return res.status(400).json({ error: 'No classes to process payment for' });
    }

    const processedPayments = [];
    const receiptItems = [];
    let totalPaidAmount = 0;
    let totalExpectedFee = 0;
    let totalDueAmount = 0;
    let totalDeltaAmount = 0;
    const classNames = [];

    for (const item of itemsToProcess) {
      const cId = parseInt(item.classId);
      if (!cId) continue;

      const targetClass = await prisma.physicalClass.findUnique({
        where: { id: cId }
      });

      if (!targetClass) continue;

      // Check enrollment specific cardType or student default cardType
      const enrollment = await prisma.physicalStudentClassEnrollment.findUnique({
        where: {
          studentId_classId: {
            studentId: sId,
            classId: cId
          }
        }
      });

      const effectiveCardType = enrollment?.cardType || item.cardType || targetStudent.cardType || 'FULL';

      let expectedFee = 0;
      if (effectiveCardType === 'FREE') {
        expectedFee = 0;
      } else if (effectiveCardType === 'HALF') {
        expectedFee = (targetClass.monthlyFee || 0) / 2;
      } else {
        expectedFee = targetClass.monthlyFee || 0;
      }

      // Existing payment
      const existingPayment = await prisma.physicalClassFeePayment.findUnique({
        where: {
          studentId_classId_month: {
            studentId: sId,
            classId: cId,
            month
          }
        }
      });

      // If class fee is already fully paid for this month, skip to avoid double payment
      const isAlreadyFullyPaid = existingPayment && 
        (existingPayment.status === 'PAID' || existingPayment.status === 'FREE_CARD' || existingPayment.status === 'HALF_PAYMENT') &&
        ((existingPayment.amount || 0) >= expectedFee || effectiveCardType === 'FREE');

      if (isAlreadyFullyPaid && !item.isIncremental) {
        continue;
      }

      let paidAmount = 0;
      if (item.amount !== undefined && item.amount !== null && item.amount !== '') {
        const inputAmount = parseFloat(item.amount);
        if (item.isIncremental && existingPayment) {
          paidAmount = (existingPayment.amount || 0) + inputAmount;
        } else {
          paidAmount = inputAmount;
        }
      } else {
        paidAmount = expectedFee;
      }

      let finalStatus = 'PAID';
      if (effectiveCardType === 'FREE') {
        finalStatus = 'FREE_CARD';
        paidAmount = 0;
      } else if (effectiveCardType === 'HALF') {
        if (paidAmount >= expectedFee) {
          finalStatus = 'HALF_PAYMENT';
        } else if (paidAmount > 0) {
          finalStatus = 'PARTIAL';
        } else {
          finalStatus = 'PENDING';
        }
      } else if (paidAmount >= expectedFee) {
        finalStatus = 'PAID';
      } else if (paidAmount > 0 && paidAmount < expectedFee) {
        finalStatus = 'PARTIAL';
      } else {
        finalStatus = 'PENDING';
      }

      const dueAmount = Math.max(0, expectedFee - paidAmount);

      // Upsert payment record
      const payment = await prisma.physicalClassFeePayment.upsert({
        where: {
          studentId_classId_month: {
            studentId: sId,
            classId: cId,
            month
          }
        },
        update: {
          status: finalStatus,
          amount: paidAmount,
          paidDate: new Date(),
          paymentMethod: paymentMethod || 'CASH',
          remark: remark || item.remark || null
        },
        create: {
          studentId: sId,
          classId: cId,
          month,
          status: finalStatus,
          amount: paidAmount,
          paidDate: new Date(),
          paymentMethod: paymentMethod || 'CASH',
          remark: remark || item.remark || null
        }
      });

      const previousAmount = existingPayment ? (existingPayment.amount || 0) : 0;
      const deltaAmount = Math.max(0, paidAmount - previousAmount);

      totalPaidAmount += paidAmount;
      totalExpectedFee += expectedFee;
      totalDueAmount += dueAmount;
      totalDeltaAmount += deltaAmount;
      classNames.push(targetClass.name);

      processedPayments.push(payment);
      receiptItems.push({
        classId: targetClass.id,
        className: targetClass.name,
        description: `Class Fee - ${targetClass.name}`,
        month,
        cardType: `${effectiveCardType} CARD`,
        amount: paidAmount,
        expectedFee,
        dueAmount,
        status: finalStatus
      });
    }

    // Single consolidated PhysicalTransaction for cash flow
    let transaction = null;
    if (totalDeltaAmount > 0) {
      const classSummaryStr = classNames.length <= 3 
        ? classNames.join(', ') 
        : `${classNames.length} Classes (${classNames.slice(0, 2).join(', ')} +${classNames.length - 2} more)`;

      const transDesc = `Multi-Class Fee (${month}) - ${classSummaryStr} - ${targetStudent.studentId} (${sName})`;

      transaction = await prisma.physicalTransaction.create({
        data: {
          type: 'INCOME',
          category: 'Class Fee',
          amount: totalDeltaAmount,
          description: transDesc,
          studentId: sId,
          isDeleted: false
        }
      });
    }

    const overallStatus = totalDueAmount === 0 ? 'PAID' : (totalPaidAmount > 0 ? 'PARTIAL' : 'PENDING');

    const receiptData = {
      receiptNo: transaction ? `REC-${transaction.id}` : `CF-${Date.now().toString().slice(-6)}`,
      studentId: targetStudent.studentId,
      studentName: sName,
      guardianPhone: targetStudent.guardianPhone || targetStudent.phone || '',
      className: classNames.length > 1 ? `Multi-Class Payment (${classNames.length} Classes)` : (classNames[0] || 'Class Fee'),
      month,
      cardType: 'MULTIPLE',
      amount: totalPaidAmount,
      totalAmount: totalPaidAmount,
      deltaAmount: totalDeltaAmount > 0 ? totalDeltaAmount : totalPaidAmount,
      expectedFee: totalExpectedFee,
      dueAmount: totalDueAmount,
      paymentMethod: paymentMethod || 'CASH',
      paidDate: new Date(),
      status: overallStatus,
      items: receiptItems,
      notes: `Keep this receipt for entrance & card verification (${receiptItems.length} classes).`
    };

    // Trigger automated bulk fee payment SMS notification
    if (totalDeltaAmount > 0 || totalPaidAmount > 0) {
      esmsService.triggerFeePaymentSms({
        student: targetStudent,
        studentId: sId,
        paidAmount: totalDeltaAmount > 0 ? totalDeltaAmount : totalPaidAmount,
        expectedFee: totalExpectedFee,
        dueAmount: totalDueAmount,
        month,
        className: classNames.length > 1 ? `Multi-Class Payment (${classNames.length} Classes)` : (classNames[0] || 'Class Fee'),
        classNames,
        receiptNo: receiptData.receiptNo,
        paymentMethod: paymentMethod || 'CASH',
        cardType: 'MULTIPLE',
        isBulk: true
      }).catch(smsErr => {
        console.error('[Automated Bulk Fee Payment SMS Error]:', smsErr.message);
      });
    }

    res.json({
      success: true,
      processedCount: processedPayments.length,
      payments: processedPayments,
      transaction,
      expectedFee: totalExpectedFee,
      paidAmount: totalPaidAmount,
      dueAmount: totalDueAmount,
      status: overallStatus,
      receiptData,
      message: `Multi-class payment recorded successfully for ${processedPayments.length} classes!`
    });

  } catch (error) {
    console.error('Error in bulk student fee payment:', error);
    res.status(500).json({ error: error.message });
  }
};

// --- CLASS COMPARISON & REPORT CONTROLLER ---
exports.compareClasses = async (req, res) => {
  try {
    const { classIds } = req.query;
    if (!classIds) {
      return res.status(400).json({ error: 'classIds query parameter is required (e.g. ?classIds=1,2)' });
    }

    let parsedIds = [];
    if (typeof classIds === 'string') {
      parsedIds = classIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id) && id > 0);
    } else if (Array.isArray(classIds)) {
      parsedIds = classIds.map(id => parseInt(id)).filter(id => !isNaN(id) && id > 0);
    }

    if (parsedIds.length < 1) {
      return res.status(400).json({ error: 'At least one valid class ID must be provided' });
    }

    // Parallel optimized fetch: classes info, enrollments, and direct students with exact field selections
    const [classes, enrollments, directStudents] = await Promise.all([
      prisma.physicalClass.findMany({
        where: { id: { in: parsedIds } },
        select: {
          id: true,
          name: true,
          grade: true,
          stream: true,
          subject: true,
          monthlyFee: true,
          teachers: {
            select: { id: true, name: true, phone: true }
          }
        }
      }),
      prisma.physicalStudentClassEnrollment.findMany({
        where: { classId: { in: parsedIds } },
        select: {
          classId: true,
          cardType: true,
          student: {
            select: {
              id: true,
              studentId: true,
              studentName: true,
              firstName: true,
              lastName: true,
              phone: true,
              whatsapp: true,
              guardianName: true,
              guardianPhone: true,
              nic: true,
              rfid: true,
              address: true,
              cardType: true,
              registrationFeeStatus: true,
              registrationFeeAmount: true,
              school: {
                select: { id: true, name: true }
              }
            }
          }
        }
      }),
      prisma.physicalStudent.findMany({
        where: {
          classId: { in: parsedIds }
        },
        select: {
          id: true,
          studentId: true,
          studentName: true,
          firstName: true,
          lastName: true,
          phone: true,
          whatsapp: true,
          guardianName: true,
          guardianPhone: true,
          nic: true,
          rfid: true,
          address: true,
          classId: true,
          cardType: true,
          registrationFeeStatus: true,
          registrationFeeAmount: true,
          school: {
            select: { id: true, name: true }
          }
        }
      })
    ]);

    if (classes.length === 0) {
      return res.status(404).json({ error: 'No classes found for the provided IDs' });
    }

    // Build unique students map
    const studentMap = new Map();

    const processStudentEnrollment = (student, clsId, enrollmentCardType) => {
      if (!student || !student.id) return;
      if (['id_number', 'student_name', 'Name'].includes(student.studentName)) return;

      if (!studentMap.has(student.id)) {
        const studentName = student.studentName || `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Student';
        studentMap.set(student.id, {
          id: student.id,
          studentId: student.studentId,
          studentName,
          firstName: student.firstName,
          lastName: student.lastName,
          phone: student.phone,
          whatsapp: student.whatsapp,
          guardianName: student.guardianName,
          guardianPhone: student.guardianPhone,
          nic: student.nic,
          rfid: student.rfid,
          address: student.address,
          school: student.school ? { id: student.school.id, name: student.school.name } : null,
          cardType: student.cardType || 'FULL',
          registrationFeeStatus: student.registrationFeeStatus || 'PENDING',
          registrationFeeAmount: student.registrationFeeAmount,
          enrolledClasses: {}
        });
      }

      const sObj = studentMap.get(student.id);
      const effectiveCardType = enrollmentCardType || sObj.cardType || student.cardType || 'FULL';
      sObj.enrolledClasses[clsId] = {
        enrolled: true,
        cardType: effectiveCardType
      };
    };

    // Process enrollments table
    enrollments.forEach(en => {
      processStudentEnrollment(en.student, en.classId, en.cardType);
    });

    // Process direct classId students
    directStudents.forEach(st => {
      processStudentEnrollment(st, st.classId, st.cardType);
    });

    const allStudentsList = Array.from(studentMap.values());

    // Categorize students
    const enhancedStudents = allStudentsList.map(st => {
      const enrolledInIds = Object.keys(st.enrolledClasses).map(Number);
      const enrolledCount = enrolledInIds.length;
      const isCommonInAll = parsedIds.every(id => st.enrolledClasses[id]?.enrolled);
      const isExclusive = enrolledCount === 1;
      const exclusiveClassId = isExclusive ? enrolledInIds[0] : null;

      return {
        ...st,
        enrolledCount,
        isCommonInAll,
        isExclusive,
        exclusiveClassId,
        enrolledClassIds: enrolledInIds
      };
    });

    // Sort students: common in all first, then by name
    enhancedStudents.sort((a, b) => {
      if (a.isCommonInAll && !b.isCommonInAll) return -1;
      if (!a.isCommonInAll && b.isCommonInAll) return 1;
      if (b.enrolledCount !== a.enrolledCount) return b.enrolledCount - a.enrolledCount;
      return (a.studentName || '').localeCompare(b.studentName || '');
    });

    const commonStudents = enhancedStudents.filter(s => s.isCommonInAll);

    // Exclusive students by class
    const exclusiveStudentsByClass = {};
    const classEnrollmentCounts = {};

    parsedIds.forEach(cId => {
      exclusiveStudentsByClass[cId] = enhancedStudents.filter(s => s.exclusiveClassId === cId);
      classEnrollmentCounts[cId] = enhancedStudents.filter(s => s.enrolledClasses[cId]?.enrolled).length;
    });

    // Pairwise overlap matrix
    const pairwiseOverlap = {};
    for (let i = 0; i < parsedIds.length; i++) {
      for (let j = i + 1; j < parsedIds.length; j++) {
        const idA = parsedIds[i];
        const idB = parsedIds[j];
        const overlapKey = `${idA}_${idB}`;
        const overlapList = enhancedStudents.filter(s => s.enrolledClasses[idA]?.enrolled && s.enrolledClasses[idB]?.enrolled);
        pairwiseOverlap[overlapKey] = {
          classAId: idA,
          classBId: idB,
          count: overlapList.length,
          studentIds: overlapList.map(s => s.id)
        };
      }
    }

    // Card Type distribution
    const cardDistribution = {
      overall: {
        FULL: enhancedStudents.filter(s => s.cardType === 'FULL').length,
        HALF: enhancedStudents.filter(s => s.cardType === 'HALF').length,
        FREE: enhancedStudents.filter(s => s.cardType === 'FREE').length
      },
      common: {
        FULL: commonStudents.filter(s => s.cardType === 'FULL').length,
        HALF: commonStudents.filter(s => s.cardType === 'HALF').length,
        FREE: commonStudents.filter(s => s.cardType === 'FREE').length
      }
    };

    return res.json({
      success: true,
      classes: classes.map(c => ({
        id: c.id,
        name: c.name,
        grade: c.grade,
        stream: c.stream,
        subject: c.subject,
        monthlyFee: c.monthlyFee || 0,
        teachers: (c.teachers || []).map(t => ({ id: t.id, name: t.name, phone: t.phone })),
        totalStudentsCount: classEnrollmentCounts[c.id] || 0,
        exclusiveStudentsCount: (exclusiveStudentsByClass[c.id] || []).length
      })),
      stats: {
        totalSelectedClasses: parsedIds.length,
        totalUniqueStudents: enhancedStudents.length,
        commonInAllCount: commonStudents.length,
        commonInAllPercentage: enhancedStudents.length > 0
          ? Math.round((commonStudents.length / enhancedStudents.length) * 100)
          : 0,
        cardDistribution,
        classEnrollmentCounts,
        exclusiveCounts: Object.keys(exclusiveStudentsByClass).reduce((acc, cId) => {
          acc[cId] = exclusiveStudentsByClass[cId].length;
          return acc;
        }, {})
      },
      pairwiseOverlap,
      students: enhancedStudents,
      commonStudents,
      exclusiveStudentsByClass
    });
  } catch (error) {
    console.error('Error comparing classes:', error);
    return res.status(500).json({ error: 'Failed to compare classes: ' + error.message });
  }
};

// --- TEACHER COMPREHENSIVE REPORTS & INVOICE DATA ---
exports.getTeacherReport = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { month, classId } = req.query;

    const tId = parseInt(teacherId);
    const teacher = await prisma.physicalTeacher.findUnique({
      where: { id: tId },
      include: {
        classes: {
          include: {
            timetables: true
          }
        },
        timetables: true
      }
    });

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Filter classes if classId is passed
    let relevantClasses = teacher.classes;
    if (classId && classId !== 'ALL') {
      relevantClasses = teacher.classes.filter(c => c.id === parseInt(classId));
    }

    const classIds = relevantClasses.map(c => c.id);

    // Get all enrollments for these classes
    const enrollments = await prisma.physicalStudentClassEnrollment.findMany({
      where: { classId: { in: classIds } },
      include: {
        student: {
          include: { school: true }
        },
        class: true
      }
    });

    const primaryStudents = await prisma.physicalStudent.findMany({
      where: {
        classId: { in: classIds },
        id: { notIn: enrollments.map(e => e.studentId) }
      },
      include: { school: true, class: true }
    });

    // Merge students with their class associations
    const classStudentMap = new Map();
    classIds.forEach(cid => classStudentMap.set(cid, []));

    enrollments.forEach(e => {
      if (classStudentMap.has(e.classId)) {
        classStudentMap.get(e.classId).push(e.student);
      }
    });

    primaryStudents.forEach(s => {
      if (s.classId && classStudentMap.has(s.classId)) {
        classStudentMap.get(s.classId).push(s);
      }
    });

    // Get all active months across classes
    const allMonthsSet = new Set();
    relevantClasses.forEach(cls => {
      let months = [];
      if (Array.isArray(cls.activeMonths)) months = cls.activeMonths;
      else if (typeof cls.activeMonths === 'string') {
        try { months = JSON.parse(cls.activeMonths); } catch (e) { months = [cls.activeMonths]; }
      } else if (cls.startMonth) months = [cls.startMonth];

      months.forEach(m => allMonthsSet.add(m));
    });

    const availableMonths = Array.from(allMonthsSet).sort().reverse();
    const selectedMonth = month || (availableMonths.length > 0 ? availableMonths[0] : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);

    // Fetch payments for these classes in the selected month
    const feePayments = await prisma.physicalClassFeePayment.findMany({
      where: {
        classId: { in: classIds },
        month: selectedMonth
      }
    });

    const paymentKeyMap = new Map();
    feePayments.forEach(p => {
      paymentKeyMap.set(`${p.studentId}_${p.classId}`, p);
    });

    let totalEnrolled = 0;
    let totalPaidStudents = 0;
    let totalGrossRevenue = 0;

    const classBreakdowns = relevantClasses.map(cls => {
      const students = classStudentMap.get(cls.id) || [];
      const enrolledCount = students.length;
      totalEnrolled += enrolledCount;

      let clsPaidCount = 0;
      let clsGross = 0;

      const studentList = students.map(st => {
        const pay = paymentKeyMap.get(`${st.id}_${cls.id}`);
        const isPaid = pay && pay.status === 'PAID';
        const isFree = pay && pay.status === 'FREE_CARD';
        const fee = isPaid ? (pay.amount || cls.monthlyFee || 0) : (cls.monthlyFee || 0);

        if (isPaid) {
          clsPaidCount++;
          clsGross += fee;
        }

        return {
          id: st.id,
          studentId: st.studentId,
          studentName: st.studentName || `${st.firstName || ''} ${st.lastName || ''}`.trim(),
          phone: st.phone,
          guardianPhone: st.guardianPhone,
          school: st.school ? st.school.name : null,
          registrationFeeStatus: st.registrationFeeStatus || 'PENDING',
          feeStatus: isPaid ? 'PAID' : (isFree ? 'FREE_CARD' : 'PENDING'),
          amount: fee,
          paidDate: pay ? pay.paidDate : null,
          paymentMethod: pay ? pay.paymentMethod : null
        };
      });

      totalPaidStudents += clsPaidCount;
      totalGrossRevenue += clsGross;

      const instCutPct = teacher.instituteCut || 0;
      const instCutAmt = (clsGross * instCutPct) / 100;
      const netPayout = clsGross - instCutAmt;

      return {
        classId: cls.id,
        className: cls.name,
        grade: cls.grade,
        stream: cls.stream,
        subject: cls.subject,
        monthlyFee: cls.monthlyFee || 0,
        enrolledCount,
        paidCount: clsPaidCount,
        unpaidCount: enrolledCount - clsPaidCount,
        grossRevenue: clsGross,
        instituteCutPercent: instCutPct,
        instituteCutAmount: instCutAmt,
        netTeacherPayout: netPayout,
        students: studentList
      };
    });

    const overallInstCutPct = teacher.instituteCut || 0;
    const overallInstCutAmt = (totalGrossRevenue * overallInstCutPct) / 100;
    const overallNetPayout = totalGrossRevenue - overallInstCutAmt;

    res.json({
      teacher: {
        id: teacher.id,
        name: teacher.name,
        image: teacher.image,
        address: teacher.address,
        whatsapp: teacher.whatsapp,
        phone: teacher.phone,
        instituteCut: teacher.instituteCut || 0,
        classes: teacher.classes
      },
      selectedMonth,
      availableMonths,
      summary: {
        totalClasses: relevantClasses.length,
        totalEnrolledStudents: totalEnrolled,
        totalPaidStudents,
        totalUnpaidStudents: totalEnrolled - totalPaidStudents,
        grossRevenue: totalGrossRevenue,
        instituteCutPercent: overallInstCutPct,
        instituteCutAmount: overallInstCutAmt,
        netTeacherPayout: overallNetPayout
      },
      classes: classBreakdowns
    });

  } catch (error) {
    console.error('Error generating teacher report:', error);
    res.status(500).json({ error: error.message });
  }
};

