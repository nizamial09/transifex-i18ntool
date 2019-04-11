const fs = require('fs');
const xliff = require('xliff');

module.exports = function(args) {
  // Remove trailing directory separator
  if (args.srcDir.substr(-1) === '/' || args.srcDir.substr(-1) === '\\') {
    args.srcDir = args.srcDir.slice(0, -1);
    args.sourceDirectory = args.srcDir;
  }

  if (args.tarDir.substr(-1) === '/' || args.tarDir.substr(-1) === '\\') {
    args.tarDir = args.tarDir.slice(0, -1);
    args.targetDirectory = args.tarDir;
  }

  // Throw error if languages are not set
  if (typeof args.languages === 'undefined') {
    process.stdout.write('No languages are defined.'.red + '\nPlease set argument ' + '-l'.cyan + ' or ' + '--languages'.cyan + '\n');
    return;
  }

  // Variable definitions 
  let rootDir = process.cwd() + '/';

  // If config is defined, paths should be relative to the config file
  if (typeof args.config !== 'undefined') {
    rootDir = rootDir + path.dirname(args.config) + '/';
  }

  let srcPath = rootDir + args.srcDir + '/' + args.srcFile;
  let tarPaths = [];

  // Set paths of the target files
  args.languages.split(',').forEach((language) => {
    tarPaths[language] = rootDir + args.tarDir + '/' + 'messages.' + language + '.xlf';
  });

  // Try to open source file
  if (!fs.existsSync(srcPath)) {
    process.stdout.write('\nSource file doesn\'t exist.'.red + '\nPath: ' + srcPath + '\n');
    return;
  }

  // Read source file and convert to JSON
  let srcContent = fs.readFileSync(srcPath, 'UTF-8');
  srcContent = xliff.xliff12ToJs(srcContent);

  // Parse language files
  for (let language in tarPaths) {
    let removedIds = 0;
    let addedTags = 0;

    // Check if file does exist
    if (!fs.existsSync(tarPaths[language])) {
      process.stdout.write('    File doesn\'t exist.'.red + ' Path (' + language + '): ' + tarPaths[language] + '\n');
      continue;
    }

    // Read language file and convert to JSON
    let content = fs.readFileSync(tarPaths[language], 'UTF-8');
    content = xliff.xliff12ToJs(content);

    // Parse transUnits
    for(let id in content['resources']['ng2.template']) {
      // Check if ID exist in source file
      if (!srcContent['resources']['ng2.template'].hasOwnProperty(id)) {
        if (args.removeUnusedIds) {
          removedIds++;
          delete content['resources']['ng2.template'][id];
        }

        continue;
      }

      // If no target tag is defined, copy from source
      if (typeof content['resources']['ng2.template'][id]['target'] === 'undefined') {
        addedTags++;
        content['resources']['ng2.template'][id]['target'] = srcContent['resources']['ng2.template'][id]['source'];
      }
    }

    // Convert to xml and save file
    content = xliff.jsToXliff12(content, (err, res) => {
      if (err != null) {
        process.stdout.write('    Error while parsing language '.red + language.red + '. Please try to merge again!'.red);
      }
    });
    fs.writeFileSync(tarPaths[language], content);

    // Output
    if (!args.quiet) {
      process.stdout.write('    Updated language ' + language + '. Added ' + addedTags + ' missing target tags. Removed ' + removedIds + ' unused trans units.\n');
    }
  }
};
