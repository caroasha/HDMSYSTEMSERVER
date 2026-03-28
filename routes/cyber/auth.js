const express = require('express');
const router = express.Router();
const authController = require('../../controllers/cyber/authController');
const { authCyber } = require('../../middleware/authCyber');

router.post('/login', authController.login);
router.put('/changepassword', authCyber, authController.changePassword);

module.exports = router;