const colors = require('colors');
const fs = require('fs');
const path = require('path');
const prompts = require('prompts');
const request = require('request');

module.exports = async function(args) {
  let organizationSlug = 'ceph';
  let projectSlug = 'ceph-dashboard';
  let i18nType = 'XLIFF';
  let resources = [];

  let rootDir = process.cwd() + '/';

  // If config is defined, paths should be relative to the config file
  if (typeof args.config !== 'undefined') {
    rootDir = rootDir + path.dirname(args.config) + '/';
  }

  // Remove trailing directory separator
  if (args.srcDir.substr(-1) === '/' || args.srcDir.substr(-1) === '\\') {
    args.srcDir = args.srcDir.slice(0, -1);
    args.sourceDirectory = args.srcDir;
  }

  let srcPath = rootDir + args.srcDir + '/' + args.srcFile;

  // Prompts
  let credentialsPrompt = [{
    type: 'text',
    name: 'token',
    message: 'Enter transifex token: '
  }];
  let resourcePrompt = [{
    type: 'text',
    name: 'name',
    message: 'Enter the name of the resource file: ',
    initial: 'Master'
  }, {
    type: 'text',
    name: 'slug',
    message: 'Enter the slug of the resource file: ',
    initial: 'master',
    validate: slug => slug.match(/^[a-zA-Z0-9_-]+$/) ? true : 'Only alphanumeric characters, underscores _, and dashes - are allowed'
  }];
  let confirmPrompt = [{
    type: 'confirm',
    name: 'confirm',
    message: 'Do you really want to update this resource?: ',
    initial: false
  }];

  // Check if source file does exist
  if (!fs.existsSync(srcPath)) {
    process.stdout.write('\nSource file doesn\'t exist.'.red + '\nPath: ' + srcPath + '\n');
    return;
  }

  // Prompt the user for the token
  let credentials = await prompts(credentialsPrompt);

  // Get resources to check if the authentication works
  await request.get({
    url: 'https://api.transifex.com/organizations/' + organizationSlug + '/projects/' + projectSlug + '/resources',
    auth: {
      username: 'api',
      password: credentials.token
    }
  }, async (err, httpResponse, body) => {
    body = JSON.parse(body);
    if (!Array.isArray(body) && typeof body.error_code !== 'undefined' && body.error_code === 'authentication_failed') {
      process.stdout.write('Authentication failed, the token is invalid.'.red + '\n');
      return;
    }

    // List of available resources
    body.forEach((r) => {
      resources.push(r.slug);
    });

    process.stdout.write('\nCurrently available resources:\n');
    process.stdout.write(resources.join(', ').cyan + '\n\n');

    let resource = await prompts(resourcePrompt);

    if (typeof resource === 'undefined' || typeof resource.name === 'undefined' || typeof resource.slug === 'undefined') {
      return;
    }

    // If resource don't exist, create new transifex resource, otherwise update existing resource
    if (resources.indexOf(resource.slug) < 0) {
      // Create resource
      request.post({
        url: 'https://www.transifex.com/api/2/project/' + projectSlug + '/resources/',
        formData: {
          name: resource.name,
          slug: resource.slug,
          i18n_type: i18nType,
          content: fs.createReadStream(srcPath),
        },
        auth: {
          username: 'api',
          password: credentials.token
        }
      }, () => {
        if (!args.q) {
          process.stdout.write('\nResource has been created\n'.cyan);
        }
      });
    } else {
      let confirm = await prompts(confirmPrompt);

      if (confirm.confirm) {
        request.put({
          url: 'https://www.transifex.com/api/2/project/' + projectSlug + '/resource/' + resource.slug + '/content/',
          formData: {
            file: fs.createReadStream(srcPath),
          },
          auth: {
            username: 'api',
            password: credentials.token
          }
        }, (err, httpResponse, body) => {
          body = JSON.parse(body);

          if (!args.q) {
            process.stdout.write('\nResource has been updated\n'.cyan);
            process.stdout.write('Strings added:   ' + body.strings_added + '\n');
            process.stdout.write('Strings updated: ' + body.strings_updated + '\n');
            process.stdout.write('Strings deleted: ' + body.strings_delete + '\n\n');
            process.stdout.write('Open resource in browser: https://transifex.com' + body.redirect + '\n');
          }
        });
      }
    }
  });
};
