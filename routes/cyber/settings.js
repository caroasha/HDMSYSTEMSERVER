const express = require('express');
const router = express.Router();
const settingsController = require('../../controllers/cyber/settingsController');
const { authCyber } = require('../../middleware/authCyber');

router.get('/', settingsController.getSettings);
router.put('/', authCyber, settingsController.updateSettings);

module.exports = router;