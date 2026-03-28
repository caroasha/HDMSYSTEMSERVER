const { connectSchool } = require('../../config/db');

let schoolConnection;
let Application;

const getModels = async () => {
  if (!schoolConnection) schoolConnection = await connectSchool();
  if (!Application) Application = schoolConnection.model('Application', require('../../models/school/Application'));
  return { Application };
};

// Public: Submit a new application
exports.submitApplication = async (req, res) => {
  try {
    const { Application } = await getModels();
    const { name, email, phone, course, message } = req.body;

    if (!name || !email || !phone || !course) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const application = new Application({
      name,
      email,
      phone,
      course,
      message: message || ''
    });
    await application.save();

    res.status(201).json({ success: true, message: 'Application submitted successfully' });
  } catch (error) {
    console.error('Submit application error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Admin: Get all applications
exports.getAllApplications = async (req, res) => {
  try {
    const { Application } = await getModels();
    const applications = await Application.find().sort({ appliedDate: -1 });
    res.json(applications);
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Admin: Update application status
exports.updateApplicationStatus = async (req, res) => {
  try {
    const { Application } = await getModels();
    const { status } = req.body;
    const application = await Application.findByIdAndUpdate(
      req.params.id,
      { status, admissionLetterGenerated: status === 'accepted' ? true : false },
      { new: true }
    );
    if (!application) return res.status(404).json({ message: 'Application not found' });
    res.json(application);
  } catch (error) {
    console.error('Update application error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Admin: Delete application
exports.deleteApplication = async (req, res) => {
  try {
    const { Application } = await getModels();
    const application = await Application.findByIdAndDelete(req.params.id);
    if (!application) return res.status(404).json({ message: 'Application not found' });
    res.json({ message: 'Application deleted' });
  } catch (error) {
    console.error('Delete application error:', error);
    res.status(500).json({ message: error.message });
  }
};