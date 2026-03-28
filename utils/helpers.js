// Generate next registration number for school students
exports.getNextRegNumber = async (StudentModel) => {
  const lastStudent = await StudentModel.findOne().sort({ createdAt: -1 });
  if (!lastStudent) return 'CS26/001';

  const lastReg = lastStudent.regNumber;
  const match = lastReg.match(/CS26\/(\d+)/);
  if (!match) return 'CS26/001';

  const nextNum = parseInt(match[1]) + 1;
  return `CS26/${nextNum.toString().padStart(3, '0')}`;
};