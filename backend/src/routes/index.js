'use strict';
const express     = require('express');
const rateLimit   = require('express-rate-limit');
const multer      = require('multer');
const path        = require('path');
const fs          = require('fs');

const authCtrl    = require('../controllers/authController');
const appCtrl     = require('../controllers/applicationController');
const payCtrl     = require('../controllers/paymentController');
const adminCtrl   = require('../controllers/adminController');
const { protectStudent, protectAdmin, requireRole } = require('../middleware/auth');

const router = express.Router();

// ── Rate limiters ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  message: { success: false, message: 'Too many requests. Try again later.' },
});

// ── Multer (file uploads) ─────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads', req.params.docType || 'misc');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.student._id}-${req.params.docType}-${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only PDF, JPG and PNG files are allowed.'));
  },
});

// ── AUTH ROUTES ───────────────────────────────────────────────────────────────
router.post('/auth/register',        authLimiter, authCtrl.register);
router.post('/auth/login',           authLimiter, authCtrl.login);
router.get('/auth/verify-email',     authCtrl.verifyEmail);
router.post('/auth/forgot-password', authLimiter, authCtrl.forgotPassword);
router.post('/auth/reset-password',  authCtrl.resetPassword);
router.get('/auth/me',               protectStudent, authCtrl.getMe);
router.post('/auth/logout',          protectStudent, authCtrl.logout);

// ── APPLICATION ROUTES (student) ──────────────────────────────────────────────
router.get('/application',                     protectStudent, appCtrl.getMyApplication);
router.put('/application/personal',            protectStudent, appCtrl.updatePersonalInfo);
router.put('/application/programme',           protectStudent, appCtrl.updateProgramme);
router.put('/application/qualifications',      protectStudent, appCtrl.updateQualifications);
router.post('/application/upload/:docType',    protectStudent, upload.single('file'), appCtrl.uploadDocument);
router.post('/application/submit',             protectStudent, appCtrl.submitApplication);
router.post('/application/check-status',       appCtrl.checkStatus);

// ── PAYMENT ROUTES ────────────────────────────────────────────────────────────
router.post('/payment/initialize',   protectStudent, payCtrl.initializePayment);
router.get('/payment/verify',        payCtrl.verifyPayment);
router.get('/payment/status',        protectStudent, payCtrl.getPaymentStatus);

// ── ADMIN AUTH ────────────────────────────────────────────────────────────────
router.post('/admin/login',          authLimiter, authCtrl.adminLogin);
router.post('/admin/seed',           adminCtrl.seedAdmin); // one-time use

// ── ADMIN ROUTES ──────────────────────────────────────────────────────────────
router.get('/admin/stats',           protectAdmin, adminCtrl.getStats);
router.get('/admin/applications',    protectAdmin, adminCtrl.listApplications);
router.get('/admin/applications/:id', protectAdmin, adminCtrl.getApplication);
router.put('/admin/applications/:id/status', protectAdmin, requireRole('superadmin', 'admin'), adminCtrl.updateStatus);

module.exports = router;
