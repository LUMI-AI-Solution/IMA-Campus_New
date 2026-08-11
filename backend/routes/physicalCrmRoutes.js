const express = require('express');
const router = express.Router();
const physicalCrmController = require('../controllers/physicalCrmController');
const physicalAttendanceController = require('../controllers/physicalAttendanceController');
// Schools
router.get('/schools', physicalCrmController.getSchools);
router.post('/schools', physicalCrmController.createSchool);
router.put('/schools/:id', physicalCrmController.updateSchool);
router.delete('/schools/:id', physicalCrmController.deleteSchool);

// Students
router.get('/students', physicalCrmController.getStudents);
router.post('/students', physicalCrmController.createStudent);
router.put('/students/:id', physicalCrmController.updateStudent);
router.delete('/students/:id', physicalCrmController.deleteStudent);

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

// Attendance Portal
router.get('/student-scan/:studentId', physicalAttendanceController.scanStudent);
router.put('/students/:id/allocate-class', physicalAttendanceController.allocateClass);
router.post('/attendance', physicalAttendanceController.markAttendance);
router.post('/attendance/unmark', physicalAttendanceController.unmarkAttendance);

module.exports = router;
