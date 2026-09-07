const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const verifyToken = require('../middlewares/authMiddleware');
const paperController = require('../controllers/paperController');

// Ensure destination folder exists
const uploadDir = path.join(__dirname, '../storage/documents');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'paper-answer-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

// All paper routes require authentication
router.use(verifyToken);

// 1. Get paper details by contentId
router.get('/content/:contentId', paperController.getPaperByContentId);

// 2. Save paper configuration (Timer mode, duration, pass marks, etc.)
router.post('/config', paperController.savePaperConfig);

// 3. Save questions and options
router.post('/questions', paperController.saveQuestions);

// 4. Start paper session
router.post('/:paperId/start', paperController.startPaper);

// 5. Submit paper (MCQ JSON answers or Structured multipart PDF)
router.post('/:paperId/submit', upload.single('answerFile'), paperController.submitPaper);

// 6. Get all submissions for a paper
router.get('/:paperId/submissions', paperController.getPaperSubmissions);

// 7. Grade a structured submission
router.put('/submissions/:submissionId/grade', paperController.gradeStructuredSubmission);

module.exports = router;
