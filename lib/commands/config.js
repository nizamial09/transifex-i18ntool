const configManager = require('../util/configManager');
const colors = require('colors');

let commands = ['token', 'username', 'email'];

module.exports = function(args) {
  // Help text how to use the config command
  let usage = [
    'Usage:',
    '  i18ntool config <command>',
    '',
    'Valid commands are: ' + commands.join(' ').cyan
  ];

  // If command is missing
  if (commands.indexOf(args['_'][1]) < 0) {
    let output;
    output = '\n' + usage.join('\n') + '\n\n';
    process.stdout.write(output);
    return;
  }

  if (args['_'][1] === 'token') {
    // If no token is submitted
    if (typeof args['_'][2] === 'undefined') {
      process.stdout.write('\nPlease enter a token\n');
      process.stdout.write('Usage: ' + 'i18ntool config token <token>'.cyan + '\n\n');
      return;
    }

    // Save token
    configManager(args['_'][1], args['_'][2]);
  }
};
