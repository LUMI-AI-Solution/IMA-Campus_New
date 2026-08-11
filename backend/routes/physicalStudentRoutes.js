const express = require('express');
const router = express.Router();
const physicalStudentController = require('../controllers/physicalStudentController');

router.post('/', physicalStudentController.createPhysicalStudent);
router.get('/', physicalStudentController.getAllPhysicalStudents);

module.exports = router;
