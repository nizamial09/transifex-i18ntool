const fs = require('fs');
const path = require('path');
const xliff = require('xliff');

module.exports = function(args) {
  // Set working directory
  let workingDir = process.cwd();

  // If config is defined, paths should be relative to the config file
  if (typeof args.config !== 'undefined') {
    workingDir = path.join(workingDir, path.dirname(args.config));
  }

  // Check if languages are set
  if (typeof args.languages === 'undefined') {
    process.stdout.write('No languages are defined.'.red + '\nPlease set argument ' + '-l'.cyan + ' or ' + '--languages'.cyan + '\n');
    return;
  }

  let srcPath = path.join(workingDir, args.srcDir, args.srcFile);
  let tarPaths = [];

  // Set paths of the target files
  for (let language of args.languages.split(',')) {
    tarPaths[language] = path.join(workingDir, args.tarDir , 'messages.' + language + '.xlf');
  }

  // Check if the source file exists
  if (!fs.existsSync(srcPath)) {
    process.stdout.write('\nSource file doesn\'t exist.'.red + '\nPath: ' + srcPath + '\n');
    return;
  }

  // Read source file and convert to JSON
  let srcContent = fs.readFileSync(srcPath, 'UTF-8');
  srcContent = xliff.xliff12ToJs(srcContent);

  // Parse language files
  let count = 0;
  for (let language in tarPaths) {
    let removedIds = 0;
    let addedTags = 0;

    // Check if file does exist
    if (!fs.existsSync(tarPaths[language])) {
      process.stdout.write(('\n    Language file \'' + language + '\' doesn\'t exist.').red + ' Path: ' + tarPaths[language]);
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
    xliff.jsToXliff12(content, (err, res) => {
      if (err != null) {
        process.stdout.write(('\n    Error while parsing language \'' + language + '\'. Please try to merge again!').red);
        return;
      }

      // Write new content to file
      fs.writeFileSync(tarPaths[language], res);

      // Output
      if (!args.quiet) {
        process.stdout.write('\n    Updated language \'' + language.cyan + '\'. Added ' + addedTags + ' missing target tags. Removed ' + removedIds + ' unused trans units.');
      }

      count++;
    });
  }

  // Print summary
  if (!args.q) {
    process.stdout.write('\n\n    Processed ' + count + ' language files\n\n');
  }
};
