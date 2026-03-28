const express = require('express');
const router = express.Router();
const inventoryController = require('../../controllers/cyber/inventoryController');
const { authCyber } = require('../../middleware/authCyber');

router.get('/', authCyber, inventoryController.getAllInventory);
router.post('/', authCyber, inventoryController.createInventory);
router.put('/:id', authCyber, inventoryController.updateInventory);
router.delete('/:id', authCyber, inventoryController.deleteInventory);

module.exports = router;