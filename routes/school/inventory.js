const express = require('express');
const router = express.Router();
const inventoryController = require('../../controllers/school/inventoryController');
const { authSchool, adminOnly } = require('../../middleware/authSchool');

// Public (authenticated) routes
router.get('/', authSchool, inventoryController.getAllInventory);
router.get('/stats', authSchool, inventoryController.getInventoryStats);
router.get('/available-computers', authSchool, inventoryController.getAvailableComputers);
router.get('/type/:type', authSchool, inventoryController.getInventoryByType);
router.get('/:id', authSchool, inventoryController.getInventoryById);

// Admin only routes
router.post('/', authSchool, adminOnly, inventoryController.createInventory);
router.put('/:id', authSchool, adminOnly, inventoryController.updateInventory);
router.delete('/:id', authSchool, adminOnly, inventoryController.deleteInventory);
router.post('/assign', authSchool, adminOnly, inventoryController.assignInventory);
router.post('/unassign/:id', authSchool, adminOnly, inventoryController.unassignInventory);

module.exports = router;