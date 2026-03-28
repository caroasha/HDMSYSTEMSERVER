const express = require('express');
const router = express.Router();
const settingsController = require('../../controllers/school/settingsController');
const { authSchool, adminOnly } = require('../../middleware/authSchool');

// Public route - anyone can view settings (for landing page)
router.get('/', settingsController.getSettings);

// Admin only routes
router.put('/', authSchool, adminOnly, settingsController.updateSettings);
router.post('/sync-computers', authSchool, adminOnly, settingsController.syncComputers);

module.exports = router;