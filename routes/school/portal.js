const express = require('express');
const router = express.Router();
const portalController = require('../../controllers/school/portalController');
const { authPortal, authSchool, adminOnly } = require('../../middleware/authSchool');

// ==================== PUBLIC ROUTES ====================
router.post('/register', portalController.register);
router.post('/login', portalController.login);

// ==================== PROTECTED ROUTES (Portal Users) ====================
router.get('/profile', authPortal, portalController.getProfile);
router.put('/profile', authPortal, portalController.updateProfile);
router.put('/change-password', authPortal, portalController.changePassword);
router.put('/deactivate', authPortal, portalController.deactivateAccount);

// ==================== ADMIN ONLY ROUTES ====================
// Get all portal users
router.get('/admin/users', authSchool, adminOnly, portalController.getAllPortalUsers);

// Get single portal user
router.get('/admin/users/:id', authSchool, adminOnly, portalController.getPortalUserById);

// Update portal user
router.put('/admin/users/:id', authSchool, adminOnly, portalController.updatePortalUser);

// Delete portal user
router.delete('/admin/users/:id', authSchool, adminOnly, portalController.deletePortalUser);

// Toggle user active status
router.put('/admin/users/:id/toggle', authSchool, adminOnly, portalController.togglePortalUserStatus);

// Reset user password
router.put('/admin/users/:id/reset-password', authSchool, adminOnly, portalController.resetPortalUserPassword);

module.exports = router;