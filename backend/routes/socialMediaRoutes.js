const express = require('express');
const router = express.Router();
const controller = require('../controllers/socialMediaController');
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

// Routes
router.post('/video-editor/upload', verifyToken, upload.single('video'), controller.uploadAndTranscribe);
router.post('/video-editor/export', verifyToken, upload.single('video'), controller.exportVideo);
module.exports = router;
