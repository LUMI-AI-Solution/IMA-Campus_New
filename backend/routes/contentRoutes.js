const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const verifyToken = require('../middlewares/authMiddleware');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const controller = require('../controllers/contentController'); 

// Upload Configs
const iconStorage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, 'storage/icons/'); },
    filename: (req, file, cb) => { cb(null, Date.now() + '_' + Math.round(Math.random() * 1E9) + path.extname(file.originalname)); }
});
const uploadIcon = multer({ storage: iconStorage });

const docStorage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, 'storage/documents/'); },
    filename: (req, file, cb) => { cb(null, Date.now() + '_' + Math.round(Math.random() * 1E9) + path.extname(file.originalname)); }
});
const uploadDoc = multer({ storage: docStorage });

const postStorage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, 'storage/posts/'); },
    filename: (req, file, cb) => { cb(null, 'post_' + Date.now() + '_' + Math.round(Math.random() * 1E9) + path.extname(file.originalname)); }
});
const uploadPost = multer({ storage: postStorage });

// ================= ROUTES =================

// Content Hub
router.post('/admin/manager/content-group/add', verifyToken, controller.addContentGroup);
router.put('/admin/content-group/update', verifyToken, controller.updateContentGroup);
router.delete('/admin/content-group/delete', verifyToken, controller.deleteContentGroup);
router.post('/admin/manager/contents/mass-assign', verifyToken, uploadDoc.fields([
    { name: 'file', maxCount: 1 }, 
    { name: 'thumbnail', maxCount: 1 }
]), controller.addContentMassAssign);

router.put('/admin/manager/contents/update', verifyToken, uploadDoc.fields([
    { name: 'file', maxCount: 1 }, 
    { name: 'thumbnail', maxCount: 1 }
]), controller.updateContentMassAssign);
router.delete('/admin/content/delete', verifyToken, controller.deleteContent);
router.get('/admin/manager/get-contents', verifyToken, controller.getContents); 

// Groups
router.post('/course-setup/group', controller.createGroup);
router.put('/course-setup/group/update', controller.updateGroup);
// 🔥 FIX: Group eka delete karana route eka 🔥
router.delete('/course-setup/group', controller.deleteGroup); 

// Posts 
router.post('/admin/manager/post/create', verifyToken, uploadPost.single('image'), controller.createAdminPost);
router.get('/admin/manager/posts', verifyToken, controller.getPosts);
router.delete('/admin/manager/post/delete', verifyToken, controller.deletePost);

// Batches Data Load
router.get('/admin/manager/batches-full', verifyToken, controller.getBatchesFull);

// Get Batches by Business ID
router.get('/admin/batches/:bizId', async (req, res) => {
    try {
        const batches = await prisma.batch.findMany({
            where: { businessId: parseInt(req.params.bizId) },
            include: { 
                groups: { include: { courses: true } },
                business: true
            },
            orderBy: [
                { itemOrder: 'asc' },
                { id: 'asc' }
            ]
        });
        const safeData = JSON.parse(JSON.stringify(batches, (k, v) => typeof v === 'bigint' ? v.toString() : v));
        res.status(200).json({ batches: safeData });
    } catch (error) { res.status(500).json({ error: "Failed to fetch batches" }); }
});

// Businesses Setup
router.post('/course-setup/business', uploadIcon.single('logo'), controller.createBusiness);
router.put('/admin/business/update', uploadIcon.single('logo'), controller.updateBusiness);
router.delete('/admin/business/delete', controller.deleteBusiness); // 🔥 NEW

// Batches Setup
router.post('/course-setup/batch', uploadIcon.single('logo'), controller.createBatch);
router.put('/admin/batch/update', uploadIcon.single('logo'), controller.updateBatch);
router.delete('/admin/batch/delete', controller.deleteBatch);
router.put('/admin/batch/lecturers', controller.updateBatchLecturers);

// Subjects Setup (🔥 FIX: uploadIcon.any() damma images ganna puluwan wenna 🔥)
router.post('/course-setup/subject', uploadIcon.any(), controller.createSubject);
router.put('/admin/course/update', uploadIcon.any(), controller.updateSubject);
router.delete('/admin/course/delete', controller.deleteSubject); 
router.put('/admin/course/assign-lecturer', controller.assignLecturer); // 🔥 NEW LECTURER ROUTE 🔥

// Installments Setup
router.post('/course-setup/installment', controller.createInstallment);
router.get('/course-setup/installment/:batchId', controller.getInstallments);
router.put('/course-setup/installment', controller.updateInstallment);
router.delete('/course-setup/installment', controller.deleteInstallment);


// Update these paths based on your actual route file structure
router.put('/course-setup/business/toggle-status', controller.toggleBusinessStatus);
router.put('/course-setup/batch/toggle-status', controller.toggleBatchStatus);

// ================= ZOOM DYNAMIC DOWNLOAD ROUTE =================
// 🔥 NEW: Zoom API එක හරහා fresh MP4 ලින්ක් එකක් අරන් App එකට JSON එකක් විදිහට දෙන Route එක 🔥
// මෙතන controller.getZoomDirectLinkJson කියලා දාන්න
router.get('/mobile/zoom-direct-link/:contentId', controller.getZoomDirectLinkJson);

// ================= APP EVENTS (ANIMATIONS) =================
// 🔥 Admin Panel එකෙන් Animation එක Set කරන්න සහ බලන්න 🔥
router.get('/admin/settings/app-event', controller.getAppEvent);
router.put('/admin/settings/app-event', controller.setAppEvent);

// ================= SYSTEM MAINTENANCE MODE =================
// 🔥 Admin Panel එකෙන් System Update Banner එක Set කරන්න සහ බලන්න 🔥
router.get('/admin/settings/maintenance-mode', controller.getMaintenanceMode);
router.put('/admin/settings/maintenance-mode', controller.setMaintenanceMode);

// 🔥 Mobile App එකෙන් Active Animation එක මොකක්ද කියලා අහන්න 🔥
router.get('/mobile/app-event', controller.getAppEvent);

module.exports = router;