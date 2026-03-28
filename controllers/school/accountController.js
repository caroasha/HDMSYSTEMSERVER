const { connectSchool } = require('../../config/db');

let schoolConnection;
let Transaction;

const getModels = async () => {
  if (!schoolConnection) schoolConnection = await connectSchool();
  if (!Transaction) Transaction = schoolConnection.model('Transaction', require('../../models/school/Transaction'));
  return { Transaction };
};

// Get balance and all transactions
exports.getBalance = async (req, res) => {
  try {
    const { Transaction } = await getModels();
    
    const transactions = await Transaction.find().sort({ date: -1 });
    
    const totalIn = transactions
      .filter(t => t.type === 'in')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
      
    const totalOut = transactions
      .filter(t => t.type === 'out')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
      
    const balance = totalIn - totalOut;
    
    res.json({ 
      balance, 
      totalIn, 
      totalOut,
      transactions 
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get all transactions
exports.getTransactions = async (req, res) => {
  try {
    const { Transaction } = await getModels();
    const transactions = await Transaction.find().sort({ date: -1 }).limit(100);
    res.json(transactions);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Add income
exports.addIncome = async (req, res) => {
  try {
    const { Transaction } = await getModels();
    const { amount, description } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Valid amount is required' });
    }
    if (!description || description.trim() === '') {
      return res.status(400).json({ message: 'Description is required' });
    }
    
    const transaction = new Transaction({
      type: 'in',
      amount: parseFloat(amount),
      description: description.trim(),
      date: new Date()
    });
    
    await transaction.save();
    res.status(201).json(transaction);
  } catch (error) {
    console.error('Add income error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Add expense
exports.addExpense = async (req, res) => {
  try {
    const { Transaction } = await getModels();
    const { amount, description } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Valid amount is required' });
    }
    if (!description || description.trim() === '') {
      return res.status(400).json({ message: 'Description is required' });
    }
    
    const transaction = new Transaction({
      type: 'out',
      amount: parseFloat(amount),
      description: description.trim(),
      date: new Date()
    });
    
    await transaction.save();
    res.status(201).json(transaction);
  } catch (error) {
    console.error('Add expense error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get summary for dashboard
exports.getSummary = async (req, res) => {
  try {
    const { Transaction } = await getModels();
    
    const transactions = await Transaction.find();
    const totalIn = transactions
      .filter(t => t.type === 'in')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalOut = transactions
      .filter(t => t.type === 'out')
      .reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIn - totalOut;
    
    res.json({
      balance,
      totalIncome: totalIn,
      totalExpense: totalOut,
      transactionCount: transactions.length
    });
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({ message: error.message });
  }
};