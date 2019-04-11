#!/usr/bin/env node

const i18ntool = require('../lib');
const util = require('../lib/util');
const minimist = require('minimist');

let argv = minimist(process.argv.slice(2), {
  string: ['c', 'srcDir', 'tarDir', 'srcFile', 'organization', 'project'],
  boolean: ['v', 'removeUnusedIds', 'q'],
  alias: util.aliases(),
  default:  {
    srcDir: '.',
    tarDir: '.',
    srcFile: 'messages.xlf',
    removeUnusedIds: true,
    q: false
  }
});

// Parse arguments
if (typeof argv['_'][0] === 'undefined' || argv['_'].length === 0) {
  // No arguments given

  if (argv["version"]) {
    // If -v or --version was passed, show the version of the CLI
    i18ntool.version();
  } else {
    // Otherwise, just show the help screen
    i18ntool.help();
  }
} else {
  // Arguments given

  // Apply config file
  try {
    util.applyConfig(argv);
  } catch (e) {
    process.stdout.write(e.message + '\n');
    process.exit();
  }

  if (typeof i18ntool[argv['_'][0]] === 'undefined') {
    // If the command doesn't exist, show the help screen
    i18ntool.help();
  } else {
    // Execute command
    i18ntool[argv['_'][0]](argv);
  }
}
