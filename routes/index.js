const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth'));
router.use('/students', require('./students'));
router.use('/employees', require('./employees'));
router.use('/fees', require('./fees'));
router.use('/accounts', require('./accounts'));
router.use('/inventory', require('./inventory'));
router.use('/portal', require('./portal'));
router.use('/settings', require('./settings'));

module.exports = router;