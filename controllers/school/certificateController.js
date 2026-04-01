const { connectSchool } = require('../../config/db');

let schoolConnection;
let CertificateCounter;
let Student;

const getModels = async () => {
  if (!schoolConnection) schoolConnection = await connectSchool();
  if (!CertificateCounter) CertificateCounter = schoolConnection.model('CertificateCounter', require('../../models/school/CertificateCounter'));
  if (!Student) Student = schoolConnection.model('Student', require('../../models/school/Student'));
  return { CertificateCounter, Student };
};

// Get or generate certificate number for a student
exports.getNextCertificateNumber = async (req, res) => {
  try {
    const { CertificateCounter, Student } = await getModels();
    const { studentId } = req.params;

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // If student already has a number, return it
    if (student.certificateNumber) {
      return res.json({ serialNumber: student.certificateNumber });
    }

    // Otherwise generate a new one
    const currentYear = new Date().getFullYear();
    let counter = await CertificateCounter.findOne({ year: currentYear });
    if (!counter) {
      counter = new CertificateCounter({ year: currentYear, lastNumber: 0 });
    }
    const nextNumber = counter.lastNumber + 1;
    counter.lastNumber = nextNumber;
    await counter.save();

    const serialNumber = `CERT${currentYear}${nextNumber.toString().padStart(3, '0')}`;

    // Save to student
    student.certificateNumber = serialNumber;
    await student.save();

    res.json({ serialNumber });
  } catch (error) {
    console.error('Error generating certificate number:', error);
    res.status(500).json({ message: error.message });
  }
};