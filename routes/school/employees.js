const express = require('express');
const router = express.Router();
const employeeController = require('../../controllers/school/employeeController');
const { authSchool, adminOnly } = require('../../middleware/authSchool');

router.get('/', authSchool, employeeController.getAllEmployees);
router.get('/search/:empId', authSchool, employeeController.getEmployeeByEmpId);
router.post('/', authSchool, adminOnly, employeeController.createEmployee);
router.put('/:id', authSchool, adminOnly, employeeController.updateEmployee);
router.delete('/:id', authSchool, adminOnly, employeeController.deleteEmployee);
router.post('/:id/pay', authSchool, adminOnly, employeeController.paySalary);

module.exports = router;