require('colors');

const configManager = require('../util/configManager');
const prompts = require('prompts');

let commands = ['token'];

module.exports = async function(args) {
  // Help text how to use the config command
  let usage = [
    'Usage:',
    '  i18ntool config <command>',
    '',
    'Valid commands are: ' + commands.join(' ').cyan
  ];

  // Prompts
  let tokenPrompt = [{
    type: 'text',
    name: 'token',
    message: 'Enter transifex token: '
  }];

  // If command is missing
  if (commands.indexOf(args['_'][1]) < 0) {
    let output;
    output = '\n' + usage.join('\n') + '\n\n';
    process.stdout.write(output);
    return;
  }

  if (args['_'][1] === 'token') {
    let token;

    // If no token is submitted
    if (typeof args['_'][2] === 'undefined') {
      token  = (await prompts(tokenPrompt)).token;
    } else {
      token = args['_'][2];
    }

    // Save token
    configManager(args['_'][1], token);
  }
};
