// BabyeyiRoutes/miniWebsites.js
// ================================================================
//  Mini-Website Routes — BabyEyi / EduRwanda  v5.0
//
//  Mounted in server.js at:
//    app.use('/api/mini-websites', miniWebsiteRoutes);
//
//  Self-managed multer — listed in MULTER_SELF_MANAGED array.
//
//  Multer field names:
//    cover, aboutImage, missionImage          (main wizard fields)
//    leaderPhoto_0 … leaderPhoto_N            (leader photos)
//    images                                   (gallery batch upload)
// ================================================================
'use strict';

const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const ctrl    = require('../Controller/miniWebsiteController');

// ── Multer: uploads/mini-websites/ ────────────────────────────
const UPLOAD_DIR = 'uploads/mini-websites';
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination(_req, _file, cb) { cb(null, UPLOAD_DIR); },
  filename(_req, file, cb) {
    const ext  = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext)
                     .replace(/\s+/g, '-')
                     .replace(/[^a-z0-9-]/gi, '')
                     .slice(0, 40) || 'file';
    cb(null, `${base}-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 },  // 8 MB per file
  fileFilter(_req, file, cb) {
    const ok = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (ok.includes(file.mimetype)) return cb(null, true);
    cb(new Error(`Only JPEG, PNG, WebP allowed (got ${file.mimetype})`));
  },
});

// Main wizard fields: cover + aboutImage + missionImage + up to 20 leader photos
const LEADER_FIELDS = Array.from({ length: 20 }, (_, i) => ({ name: `leaderPhoto_${i}`, maxCount: 1 }));
const miniFields = upload.fields([
  { name: 'cover',        maxCount: 1 },
  { name: 'aboutImage',   maxCount: 1 },
  { name: 'missionImage', maxCount: 1 },
  ...LEADER_FIELDS,
]);

// Gallery batch upload: up to 30 images at once
const galleryFields = upload.fields([
  { name: 'images', maxCount: 30 },
]);

// ── Named routes BEFORE /:miniId ────────────────────────────────
router.get('/school/:schoolId', ctrl.getBySchool);
router.get('/slug/:slug',       ctrl.getBySlug);

// ── Gallery images (dedicated upload) ──────────────────────────
router.post('/gallery-images', galleryFields, ctrl.uploadGalleryImages);

// ── Standard CRUD ───────────────────────────────────────────────
router.get('/',                    ctrl.list);
router.get('/filter-options',      ctrl.getFilterOptions);
router.get('/:miniId',             ctrl.getById);
router.post('/',                   miniFields, ctrl.create);
router.put('/:miniId',             miniFields, ctrl.update);
router.patch('/:miniId/publish',   ctrl.publish);
router.patch('/:miniId/unpublish', ctrl.unpublish);
router.delete('/:miniId',          ctrl.remove);

//router.get('/babyeyi/verify/:docId', verifyController);  // public
//router.get('/babyeyi/:id', getOneController);            // public
//router.get('/babyeyi', listController);                  // public

module.exports = router;