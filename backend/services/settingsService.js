const fs = require('fs');
const path = require('path');

// Define default system settings
const DEFAULT_SETTINGS = {
  email: {
    smtpServer: '',
    smtpPort: '25',
    smtpUser: '',
    smtpPass: '',
    useTls: false,
    defaultFrom: 'printer-report@example.com',
    defaultTo: 'admin@example.com'
  },
  papercut: {
    host: '',
    port: '9191',
    username: '',
    password: '',
    apiToken: ''
  },
  license: {
    expirationDate: '2024-12-31'
  }
};

// Settings file path
const SETTINGS_FILE = path.join(__dirname, '../../settings.json');

class SettingsService {
  constructor() {
    this.settings = this.loadSettings();
  }

  /**
   * Load settings from file
   * @returns {Object} Loaded settings
   */
  loadSettings() {
    try {
      if (fs.existsSync(SETTINGS_FILE)) {
        const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
        return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
      }
    } catch (error) {
      console.error('Error loading settings:', error.message);
    }
    return DEFAULT_SETTINGS;
  }

  /**
   * Save settings to file
   * @param {Object} newSettings - New settings to save
   * @returns {Object} Updated settings
   */
  saveSettings(newSettings) {
    try {
      // Deep merge for reportSettings to avoid losing sub-keys
      if (newSettings.reportSettings && this.settings.reportSettings) {
        newSettings.reportSettings = { ...this.settings.reportSettings, ...newSettings.reportSettings };
      }
      this.settings = { ...this.settings, ...newSettings };
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(this.settings, null, 2), 'utf8');
      console.log('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error.message);
    }
    return this.settings;
  }

  /**
   * Get current settings
   * @returns {Object} Current settings
   */
  getSettings() {
    return this.settings;
  }

  /**
   * Get license expiration date from settings
   * @returns {string} Expiration date string
   */
  getLicenseExpirationDate() {
    // Make settings.json value have higher priority than environment variable
    return this.settings.license?.expirationDate || '2024-12-31';
  }
}

module.exports = new SettingsService();