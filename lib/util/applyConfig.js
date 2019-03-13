const aliases = require('./aliases');
const colors = require('colors');

module.exports = function(args) {
  if (typeof args['config'] !== 'undefined') {
    let cwd = process.cwd() + '/';
    let configFile;

    // Handle exception if file doesn't exist or can not be loaded
    try {
      configFile = require(cwd + args['config']);
    } catch(e) {
      throw new Error('\nConfig file could not be loaded: '.red + '\n' + e.message);
    }

    // List of all aliases as key
    let aliasesList = Object.assign(aliases(), ...Object.entries(aliases()).map(([a,b]) => ({ [b]: a })));

    // Overwrite cli options with options from config file
    for (let opt in configFile) {
      args[opt] = configFile[opt];

      if (aliasesList.hasOwnProperty(opt)) {
        args[aliasesList[opt]] = configFile[opt];
      }
    }
  }
};
