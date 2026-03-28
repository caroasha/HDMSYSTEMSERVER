const { connectSchool } = require('../../config/db');

let schoolConnection;
let Settings;
let Inventory;

const getModels = async () => {
  if (!schoolConnection) schoolConnection = await connectSchool();
  if (!Settings) Settings = schoolConnection.model('Settings', require('../../models/school/Settings'));
  if (!Inventory) Inventory = schoolConnection.model('Inventory', require('../../models/school/Inventory'));
  return { Settings, Inventory };
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

// Sync computers to inventory with values
const syncComputersToInventory = async (settings) => {
  const { Inventory } = await getModels();
  const computerList = generateComputerListWithValues(settings);
  const computerNames = computerList.map(c => c.name);
  
  const existingComputers = await Inventory.find({ type: 'Computer' });
  const existingMap = new Map(existingComputers.map(c => [c.name, c]));
  
  let added = 0, updated = 0, removed = 0, skipped = 0;
  
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
  
  for (const existing of existingComputers) {
    if (!computerNames.includes(existing.name)) {
      if (existing.status !== 'Assigned') {
        await Inventory.findByIdAndDelete(existing._id);
        removed++;
      } else {
        skipped++;
      }
    }
  }
  
  if (added > 0 || updated > 0 || removed > 0 || skipped > 0) {
    console.log(`📦 Computer sync: +${added} added, ~${updated} updated, -${removed} removed, ${skipped} assigned kept`);
  }
};

// ==================== PUBLIC ROUTE (No Auth Required) ====================
// Get settings - anyone can view (for landing page)
exports.getSettings = async (req, res) => {
  try {
    const { Settings } = await getModels();
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
      await settings.save();
      console.log('✅ Default settings created');
    }
    res.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ==================== PROTECTED ROUTES (Admin Only) ====================
// Update settings and sync computers to inventory
exports.updateSettings = async (req, res) => {
  try {
    const { Settings } = await getModels();
    let settings = await Settings.findOne();
    if (!settings) settings = new Settings();
    
    Object.assign(settings, req.body);
    settings.updatedAt = new Date();
    await settings.save();
    
    // Sync computers to inventory if enabled
    if (settings.syncComputersToInventory) {
      await syncComputersToInventory(settings);
    }
    
    res.json(settings);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(400).json({ message: error.message });
  }
};

// Force sync computers to inventory (manual trigger)
exports.syncComputers = async (req, res) => {
  try {
    const { Settings } = await getModels();
    const settings = await Settings.findOne();
    if (!settings) {
      return res.status(404).json({ message: 'Settings not found' });
    }
    
    await syncComputersToInventory(settings);
    res.json({ success: true, message: 'Computers synced to inventory successfully' });
  } catch (error) {
    console.error('Sync computers error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get public settings (alias for getSettings, kept for compatibility)
exports.getPublicSettings = exports.getSettings;

// Get settings for admin (same as getSettings, but could add more details later)
exports.getAdminSettings = exports.getSettings;