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

exports.generateReport = async (req, res) => {
  try {
    const { Service, Transaction } = await getModels();
    const { fromDate, toDate } = req.body;

    const from = new Date(fromDate);
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);

    const services = await Service.find({
      dateTime: { $gte: from, $lte: to }
    });
    const expenses = await Transaction.find({
      type: 'out',
      date: { $gte: from, $lte: to }
    });

    const totalIncome = services.reduce((sum, s) => sum + s.amount, 0);
    const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

    res.json({
      success: true,
      data: {
        period: { from: fromDate, to: toDate, generatedAt: new Date() },
        totals: { totalIncome, totalExpense, netBalance: totalIncome - totalExpense },
        services,
        expenses
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};