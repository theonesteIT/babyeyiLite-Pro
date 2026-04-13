// ================================================================
//  admissionRoutes.js  —  BabyEyi / EduRwanda  v1.0
//
//  Mount in server.js:
//    const admissionRoutes = require('./BabyeyiRoutes/admissionRoutes');
//    app.use('/api/admissions', admissionRoutes);
//
//  Also add '/api/admissions' to MULTER_SELF_MANAGED array.
// ================================================================
'use strict';

const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const ctrl    = require('../Controller/admissionController');

// ── Multer for application file uploads ───────────────────────
const UPLOAD_DIR = 'uploads/admission-files';
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext)
                     .replace(/\s+/g, '-').replace(/[^a-z0-9-]/gi, '').slice(0, 40) || 'file';
    cb(null, `${base}-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 30 },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg','image/jpg','image/png','image/webp','application/pdf',
                'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    ok.includes(file.mimetype) ? cb(null, true) : cb(new Error(`File type not allowed: ${file.mimetype}`));
  },
});

// Dynamic fields: q_1, q_2 … q_99 for file uploads
const appFields = Array.from({ length: 99 }, (_, i) => ({ name: `q_${i + 1}`, maxCount: 10 }));
const applyUpload = upload.fields(appFields);

// ── Auth helper (school manager only) ────────────────────────
function requireManager(req, res, next) {
  if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });
  const code = (req.user.role_code || '').toUpperCase();
  if (!['SCHOOL_ADMIN','SCHOOL_MANAGER','SUPER_ADMIN','FULL_SYSTEM_CONTROLLER','SA'].includes(code))
    return res.status(403).json({ success: false, message: 'Access denied' });
  next();
}

// ── Routes ────────────────────────────────────────────────────

// Public routes (no auth)
router.get('/forms/:formId/public',  ctrl.getPublic);
router.get('/forms/:formId/stats',   ctrl.getStats);
router.get('/slug/:slug',            ctrl.getBySlug);
router.post('/forms/:formId/apply',  (req, res, next) => {
  applyUpload(req, res, err => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    next();
  });
}, ctrl.apply);

// Manager routes (auth required)
router.get('/school/:schoolId',                  requireManager, ctrl.getBySchool);
router.post('/school/:schoolId',                 requireManager, ctrl.upsert);
router.put('/school/:schoolId',                  requireManager, ctrl.upsert);
router.patch('/forms/:formId/status',            requireManager, ctrl.patchStatus);
router.delete('/forms/:formId',                  requireManager, ctrl.remove);
router.get('/forms/:formId/applications',        requireManager, ctrl.listApplications);
router.get('/applications/:appId',               requireManager, ctrl.getApplication);
router.patch('/applications/:appId/status',      requireManager, ctrl.patchAppStatus);
router.get('/track/:referenceNo',    ctrl.trackApplication);

module.exports = router;