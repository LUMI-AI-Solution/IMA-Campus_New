const express = require('express');
const router = express.Router();
const controller = require('../controllers/socialMediaController');
const taskController = require('../controllers/socialMediaTaskController');
const verifyToken = require('../middlewares/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../public/uploads/social-media');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '_' + file.originalname.replace(/\s+/g, '_'));
    }
});

const upload = multer({ storage });

// AI Video Editor Routes
router.post('/video-editor/upload', verifyToken, upload.single('video'), controller.uploadAndTranscribe);
router.post('/video-editor/export', verifyToken, upload.single('video'), controller.exportVideo);

// Image File Upload Route
router.post('/upload-image', verifyToken, upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No image file uploaded' });
    const imageUrl = `/uploads/social-media/${req.file.filename}`;
    return res.status(200).json({ message: 'Image uploaded successfully', imageUrl });
});

// Task Delegation & Stage Tracking Routes
router.post('/tasks', verifyToken, taskController.createTask);
router.get('/tasks', verifyToken, taskController.getTasks);
router.put('/tasks/assign', verifyToken, taskController.approveAndAssignTask);
router.put('/tasks/stage', verifyToken, taskController.updateTaskStage);

// Calendar Overview Routes
router.post('/calendar', verifyToken, taskController.createCalendarPost);
router.get('/calendar', verifyToken, taskController.getCalendarPosts);
router.delete('/calendar/:id', verifyToken, taskController.deleteCalendarPost);

module.exports = router;
