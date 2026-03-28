const express = require('express');
const router = express.Router();
const authController = require('../../controllers/school/authController');
const { authSchool, adminOnly } = require('../../middleware/authSchool');

router.post('/login', authController.login);
router.put('/changepassword', authSchool, authController.changePassword);
router.post('/register', authSchool, adminOnly, authController.register);
router.get('/users', authSchool, adminOnly, authController.getAllUsers);
router.put('/users/:id', authSchool, adminOnly, authController.updateUserRole);
router.delete('/users/:id', authSchool, adminOnly, authController.deleteUser);

module.exports = router;