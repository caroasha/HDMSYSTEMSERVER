const { connectCyber } = require('../../config/db');

let cyberConnection;
let Service;
let Transaction;

const getModels = async () => {
  if (!cyberConnection) cyberConnection = await connectCyber();
  if (!Service) Service = cyberConnection.model('Service', require('../../models/cyber/Service'));
  if (!Transaction) Transaction = cyberConnection.model('Transaction', require('../../models/cyber/Transaction'));
  return { Service, Transaction };
};

exports.getAllServices = async (req, res) => {
  try {
    const { Service } = await getModels();
    const services = await Service.find().sort({ dateTime: -1 });
    res.json({ success: true, data: services });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createService = async (req, res) => {
  try {
    const { Service, Transaction } = await getModels();
    const service = new Service(req.body);
    await service.save();

    // Create income transaction
    const transaction = new Transaction({
      type: 'in',
      amount: req.body.amount,
      description: `Service: ${req.body.serviceType} - ${req.body.description || ''}`,
      reference: service._id,
      date: req.body.dateTime || new Date()
    });
    await transaction.save();

    res.status(201).json({ success: true, data: service });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteService = async (req, res) => {
  try {
    const { Service, Transaction } = await getModels();
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) return res.status(404).json({ message: 'Service not found' });

    // Delete associated transaction
    await Transaction.findOneAndDelete({ reference: req.params.id });
    res.json({ message: 'Service deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTodayServices = async (req, res) => {
  try {
    const { Service } = await getModels();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const services = await Service.find({
      dateTime: { $gte: today, $lt: tomorrow }
    });
    const total = services.reduce((sum, s) => sum + s.amount, 0);
    res.json({ count: services.length, total });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};