const fs = require('fs');
const path = require('path');

module.exports = (key, value = null) => {
  let filename = '.i18ntool';
  let configPath = process.platform === 'win32' ? process.env.USERPROFILE + path.sep + filename : process.env.HOME + path.sep + filename ;

  // Create config file if it does not exist
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, '');
  }

  // Load config file and convert to json
  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'UTF-8'));
  } catch (err) {
    config = {};
  }

  // If just a key was submitted, read the value
  if (value === null) {
    if (typeof config[key] === 'undefined') {
      throw new Error('The requested setting ' + key + ' is not set yet');
    }

    return config[key];
  }

  // Set config option
  config[key] = value;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  return true;
};
