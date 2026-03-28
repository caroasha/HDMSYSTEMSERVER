const { connectCyber } = require('../../config/db');

let cyberConnection;
let Inventory;

const getModels = async () => {
  if (!cyberConnection) cyberConnection = await connectCyber();
  if (!Inventory) Inventory = cyberConnection.model('Inventory', require('../../models/cyber/Inventory'));
  return { Inventory };
};

exports.getAllInventory = async (req, res) => {
  try {
    const { Inventory } = await getModels();
    const items = await Inventory.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createInventory = async (req, res) => {
  try {
    const { Inventory } = await getModels();
    const item = new Inventory(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateInventory = async (req, res) => {
  try {
    const { Inventory } = await getModels();
    const item = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json(item);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteInventory = async (req, res) => {
  try {
    const { Inventory } = await getModels();
    const item = await Inventory.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json({ message: 'Item deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};