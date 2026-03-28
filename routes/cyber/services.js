const express = require('express');
const router = express.Router();
const serviceController = require('../../controllers/cyber/serviceController');
const { authCyber } = require('../../middleware/authCyber');

router.get('/', authCyber, serviceController.getAllServices);
router.post('/', authCyber, serviceController.createService);
router.delete('/:id', authCyber, serviceController.deleteService);
router.get('/today', authCyber, serviceController.getTodayServices);

module.exports = router;