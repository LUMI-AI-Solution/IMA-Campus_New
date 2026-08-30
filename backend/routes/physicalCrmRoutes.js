const express = require('express');
const router = express.Router();
const physicalCrmController = require('../controllers/physicalCrmController');
const physicalAttendanceController = require('../controllers/physicalAttendanceController');
const physicalStudentReportController = require('../controllers/physicalStudentReportController');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// Schools
router.get('/schools', physicalCrmController.getSchools);
router.post('/schools', physicalCrmController.createSchool);
router.put('/schools/:id', physicalCrmController.updateSchool);
router.delete('/schools/:id', physicalCrmController.deleteSchool);

// Students
router.get('/students', physicalCrmController.getStudents);
router.post('/students', physicalCrmController.createStudent);
router.post('/students/import-excel', upload.single('file'), physicalCrmController.bulkImportStudents);
router.post('/students/allocate-excel', upload.single('file'), physicalCrmController.allocateExcelToClass);
router.put('/students/:id', physicalCrmController.updateStudent);
router.delete('/students/:id', physicalCrmController.deleteStudent);

// Student Reports & Matrix
router.get('/student-reports', physicalStudentReportController.getStudentReports);
router.get('/student-reports/:id', physicalStudentReportController.getStudentFullDetails);

// SMS Gateway & Broadcast
router.get('/sms/settings', physicalStudentReportController.getSmsSettings);
router.post('/sms/settings', physicalStudentReportController.saveSmsSettings);
router.post('/sms/test', physicalStudentReportController.sendTestSms);
router.post('/sms/send-bulk', physicalStudentReportController.sendBulkSms);
router.get('/sms/logs', physicalStudentReportController.getSmsLogs);

// Classes
router.get('/classes', physicalCrmController.getClasses);
router.post('/classes', physicalCrmController.createClass);
router.put('/classes/:id', physicalCrmController.updateClass);
router.delete('/classes/:id', physicalCrmController.deleteClass);

// Teachers
router.get('/teachers', physicalCrmController.getTeachers);
router.post('/teachers', physicalCrmController.createTeacher);
router.put('/teachers/:id', physicalCrmController.updateTeacher);
router.delete('/teachers/:id', physicalCrmController.deleteTeacher);

// Class Fee Matrix & Payment
router.get('/classes/:classId/fee-matrix', physicalCrmController.getClassFeeMatrix);
router.post('/classes/toggle-fee', physicalCrmController.toggleStudentFeePayment);

// Teacher Reports & Invoices
router.get('/teachers/:teacherId/reports', physicalCrmController.getTeacherReport);

// Attendance Portal
router.get('/students-search', physicalAttendanceController.searchStudents);
router.get('/student-scan/:studentId', physicalAttendanceController.scanStudent);
router.put('/students/:id/allocate-class', physicalAttendanceController.allocateClass);
router.post('/attendance', physicalAttendanceController.markAttendance);
router.post('/attendance/unmark', physicalAttendanceController.unmarkAttendance);

module.exports = router;
