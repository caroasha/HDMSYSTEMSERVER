const { connectCyber } = require('../../config/db');

let cyberConnection;
let Settings;

const getModels = async () => {
  if (!cyberConnection) cyberConnection = await connectCyber();
  if (!Settings) Settings = cyberConnection.model('Settings', require('../../models/cyber/Settings'));
  return { Settings };
};

exports.getSettings = async (req, res) => {
  try {
    const { Settings } = await getModels();
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
      await settings.save();
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const { Settings } = await getModels();
    let settings = await Settings.findOne();
    if (!settings) settings = new Settings();
    Object.assign(settings, req.body);
    settings.updatedAt = new Date();
    await settings.save();
    res.json(settings);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};