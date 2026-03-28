const { connectSchool } = require('../../config/db');

let schoolConnection;
let Inventory;
let Student;
let Employee;
let Settings;

const getModels = async () => {
  if (!schoolConnection) schoolConnection = await connectSchool();
  if (!Inventory) Inventory = schoolConnection.model('Inventory', require('../../models/school/Inventory'));
  if (!Student) Student = schoolConnection.model('Student', require('../../models/school/Student'));
  if (!Employee) Employee = schoolConnection.model('Employee', require('../../models/school/Employee'));
  if (!Settings) Settings = schoolConnection.model('Settings', require('../../models/school/Settings'));
  return { Inventory, Student, Employee, Settings };
};

// Helper to generate computer list with values from settings
const generateComputerListWithValues = (settings) => {
  if (!settings || !settings.computers) return [];
  const { computers } = settings;
  const defaultVal = computers.defaultValue ?? 0;

  if (computers.mode === 'range') {
    const { start, end, prefix, defaultValue } = computers.range;
    const effectiveDefault = (defaultValue !== undefined && defaultValue !== null) ? defaultValue : defaultVal;
    const list = [];
    for (let i = start; i <= end; i++) {
      list.push({
        name: `${prefix}${String(i).padStart(2, '0')}`,
        value: effectiveDefault
      });
    }
    return list;
  } else {
    return (computers.manualList || []).map(item => {
      const name = typeof item === 'string' ? item : item.name;
      const val = (typeof item === 'object' && item.value !== undefined && item.value !== null)
        ? item.value
        : defaultVal;
      return { name, value: val };
    });
  }
};

// Sync computers from settings to inventory with values
const syncComputersToInventory = async () => {
  const { Settings, Inventory } = await getModels();
  const settings = await Settings.findOne();
  if (!settings) return;
  
  if (!settings.syncComputersToInventory) {
    console.log('Computer sync is disabled in settings');
    return;
  }
  
  const computerList = generateComputerListWithValues(settings);
  const computerNames = computerList.map(c => c.name);
  
  // Get existing computers in inventory
  const existingComputers = await Inventory.find({ type: 'Computer' });
  const existingMap = new Map(existingComputers.map(c => [c.name, c]));
  
  let added = 0;
  let updated = 0;
  let removed = 0;
  let skipped = 0;
  
  // Add new computers or update existing ones with new value
  for (const computer of computerList) {
    const existing = existingMap.get(computer.name);
    if (!existing) {
      const newComputer = new Inventory({
        name: computer.name,
        type: 'Computer',
        value: computer.value,
        status: 'Available',
        notes: 'Auto-created from settings'
      });
      await newComputer.save();
      added++;
    } else if (existing.value !== computer.value) {
      existing.value = computer.value;
      await existing.save();
      updated++;
    }
  }
  
  // Remove computers that are no longer in settings (only if not assigned)
  for (const existing of existingComputers) {
    if (!computerNames.includes(existing.name)) {
      if (existing.status !== 'Assigned') {
        await Inventory.findByIdAndDelete(existing._id);
        removed++;
      } else {
        skipped++;
        console.log(`⚠️ Cannot remove assigned computer: ${existing.name}`);
      }
    }
  }
  
  if (added > 0 || updated > 0 || removed > 0 || skipped > 0) {
    console.log(`📦 Computer sync: +${added} added, ~${updated} updated, -${removed} removed, ${skipped} assigned skipped`);
  }
};

// Get all inventory items
exports.getAllInventory = async (req, res) => {
  try {
    const { Inventory } = await getModels();
    const items = await Inventory.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get available computers (for student enrollment)
exports.getAvailableComputers = async (req, res) => {
  try {
    const { Inventory, Settings } = await getModels();
    
    // First, ensure computers are synced from settings
    await syncComputersToInventory();
    
    // Get all computers from settings to show in dropdown
    const settings = await Settings.findOne();
    const computerList = generateComputerListWithValues(settings);
    
    // Get occupied computers from inventory
    const occupied = await Inventory.find({ type: 'Computer', status: 'Assigned' }).select('name');
    const occupiedNames = occupied.map(c => c.name);
    
    // Available = all computers from settings minus occupied ones
    const available = computerList.map(c => c.name).filter(name => !occupiedNames.includes(name));
    
    res.json({ available, occupied: occupiedNames, allComputers: computerList });
  } catch (error) {
    console.error('Get available computers error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get inventory item by ID
exports.getInventoryById = async (req, res) => {
  try {
    const { Inventory } = await getModels();
    const item = await Inventory.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new inventory item
exports.createInventory = async (req, res) => {
  try {
    const { Inventory } = await getModels();
    const { name, type, value, status, assignedTo, assignedModel, purchaseDate, serialNumber, notes } = req.body;

    // Check if name already exists
    const existing = await Inventory.findOne({ name });
    if (existing) return res.status(400).json({ message: 'Item name already exists' });

    const item = new Inventory({
      name,
      type,
      value: value || 0,
      status: status || 'Available',
      assignedTo: assignedTo || null,
      assignedModel: assignedModel || null,
      purchaseDate,
      serialNumber,
      notes
    });

    await item.save();
    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update inventory item
exports.updateInventory = async (req, res) => {
  try {
    const { Inventory } = await getModels();
    const item = await Inventory.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    // Prevent changing name if already in use
    if (req.body.name && req.body.name !== item.name) {
      const existing = await Inventory.findOne({ name: req.body.name });
      if (existing) return res.status(400).json({ message: 'Item name already exists' });
    }

    // If changing status from Assigned to something else, clear assignment
    if (item.status === 'Assigned' && req.body.status !== 'Assigned') {
      req.body.assignedTo = null;
      req.body.assignedModel = null;
    }

    Object.assign(item, req.body);
    await item.save();
    res.json(item);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete inventory item (only if not assigned)
exports.deleteInventory = async (req, res) => {
  try {
    const { Inventory } = await getModels();
    const item = await Inventory.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    
    if (item.status === 'Assigned') {
      return res.status(400).json({ message: 'Cannot delete an assigned asset' });
    }
    
    await item.deleteOne();
    res.json({ message: 'Item deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get inventory statistics (total value, counts by type)
exports.getInventoryStats = async (req, res) => {
  try {
    const { Inventory } = await getModels();
    const all = await Inventory.find();
    const totalValue = all.reduce((sum, i) => sum + (i.value || 0), 0);
    const byType = all.reduce((acc, i) => {
      acc[i.type] = (acc[i.type] || 0) + (i.value || 0);
      return acc;
    }, {});
    res.json({ totalValue, byType, totalItems: all.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Assign inventory item to a student or employee
exports.assignInventory = async (req, res) => {
  try {
    const { Inventory, Student, Employee } = await getModels();
    const { itemId, assignToId, assignType } = req.body;

    const item = await Inventory.findById(itemId);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    if (item.status === 'Assigned') {
      return res.status(400).json({ message: 'Item already assigned' });
    }

    let person = null;
    if (assignType === 'Student') {
      person = await Student.findById(assignToId);
      if (!person) return res.status(404).json({ message: 'Student not found' });
    } else if (assignType === 'Employee') {
      person = await Employee.findById(assignToId);
      if (!person) return res.status(404).json({ message: 'Employee not found' });
    } else {
      return res.status(400).json({ message: 'Invalid assign type' });
    }

    item.status = 'Assigned';
    item.assignedTo = assignToId;
    item.assignedModel = assignType;
    await item.save();

    res.json({ message: `Item assigned to ${person.name}`, item });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Unassign inventory item (make it available)
exports.unassignInventory = async (req, res) => {
  try {
    const { Inventory } = await getModels();
    const item = await Inventory.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    if (item.status !== 'Assigned') {
      return res.status(400).json({ message: 'Item is not currently assigned' });
    }

    item.status = 'Available';
    item.assignedTo = null;
    item.assignedModel = null;
    await item.save();

    res.json({ message: 'Item unassigned successfully', item });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get inventory items by type
exports.getInventoryByType = async (req, res) => {
  try {
    const { Inventory } = await getModels();
    const items = await Inventory.find({ type: req.params.type }).sort({ name: 1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Force sync computers from settings (admin only)
exports.syncComputers = async (req, res) => {
  try {
    await syncComputersToInventory();
    res.json({ success: true, message: 'Computers synced from settings to inventory successfully' });
  } catch (error) {
    console.error('Sync computers error:', error);
    res.status(500).json({ message: error.message });
  }
};