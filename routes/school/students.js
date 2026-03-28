const express = require('express');
const router = express.Router();
const studentController = require('../../controllers/school/studentController');
const { authSchool, adminOnly } = require('../../middleware/authSchool');

// Public (authenticated) routes
router.get('/', authSchool, studentController.getAllStudents);
router.get('/stats', authSchool, studentController.getStudentStats);
router.get('/course/:course', authSchool, studentController.getStudentsByCourse);
router.get('/search/:regNumber', authSchool, studentController.getStudentByReg);
router.get('/:id', authSchool, studentController.getStudentById);

// Admin only routes
router.post('/', authSchool, adminOnly, studentController.createStudent);
router.put('/:id', authSchool, adminOnly, studentController.updateStudent);
router.delete('/:id', authSchool, adminOnly, studentController.deleteStudent);

module.exports = router;