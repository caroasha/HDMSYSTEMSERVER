const { connectCyber } = require('../../config/db');

let cyberConnection;
let Transaction;

const getModels = async () => {
  if (!cyberConnection) cyberConnection = await connectCyber();
  if (!Transaction) Transaction = cyberConnection.model('Transaction', require('../../models/cyber/Transaction'));
  return { Transaction };
};

exports.getAllTransactions = async (req, res) => {
  try {
    const { Transaction } = await getModels();
    const transactions = await Transaction.find().sort({ date: -1 });
    const totalIn = transactions.filter(t => t.type === 'in').reduce((s, t) => s + t.amount, 0);
    const totalOut = transactions.filter(t => t.type === 'out').reduce((s, t) => s + t.amount, 0);
    res.json({
      transactions,
      balance: totalIn - totalOut,
      totalIn,
      totalOut
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addExpense = async (req, res) => {
  try {
    const { Transaction } = await getModels();
    const { reason, amount } = req.body;
    const transaction = new Transaction({
      type: 'out',
      amount,
      description: reason,
      date: new Date()
    });
    await transaction.save();
    res.status(201).json({ success: true, transaction });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getLastExpense = async (req, res) => {
  try {
    const { Transaction } = await getModels();
    const lastExpense = await Transaction.findOne({ type: 'out' }).sort({ date: -1 });
    res.json({ data: lastExpense });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};