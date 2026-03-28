const express = require('express');
const router = express.Router();
const applicationController = require('../../controllers/school/applicationController');
const { authSchool, adminOnly } = require('../../middleware/authSchool');

// Public route (no auth required)
router.post('/', applicationController.submitApplication);

// Admin only routes
router.get('/', authSchool, adminOnly, applicationController.getAllApplications);
router.put('/:id', authSchool, adminOnly, applicationController.updateApplicationStatus);
router.delete('/:id', authSchool, adminOnly, applicationController.deleteApplication);

module.exports = router;