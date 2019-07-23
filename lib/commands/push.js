require('colors');

const configManager = require('../util/configManager');
const fs = require('fs');
const path = require('path');
const prompts = require('prompts');
const request = require('request');

module.exports = async function(args) {
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
  let organizationProjectPrompt = [{
    type: 'text',
    name: 'organization',
    message: 'Enter the name of the organization: ',
    validate: organization => organization.match(/^[a-zA-Z0-9_-]+$/) ? true : 'Only alphanumeric characters, underscores _, and dashes - are allowed'
  }, {
    type: 'text',
    name: 'project',
    message: 'Enter the slug of the project: ',
    validate: project => project.match(/^[a-zA-Z0-9_-]+$/) ? true : 'Only alphanumeric characters, underscores _, and dashes - are allowed'
  }];
  let resourcePrompt = [{
    type: 'text',
    name: 'name',
    message: 'Enter the name of the resource: ',
    initial: 'Master',
    validate: slug => slug.match(/^[a-zA-Z0-9_-]+$/) ? true : 'Only alphanumeric characters, underscores _, and dashes - are allowed'
  }, {
    type: 'text',
    name: 'slug',
    message: 'Enter the slug of the resource: ',
    initial: 'master',
    validate: slug => slug.match(/^[a-zA-Z0-9_-]+$/) ? true : 'Only alphanumeric characters, underscores _, and dashes - are allowed'
  }];
  let confirmPrompt = [{
    type: 'confirm',
    name: 'confirm',
    message: 'Do you really want to update this resource?: ',
    initial: false
  }];

  // Check if organization and project slug have been set.
  if (typeof args.o === 'undefined' || typeof args.p === 'undefined') {
    organizationProject = await prompts(organizationProjectPrompt);
    args.o = organizationProject.organization;
    args.p = organizationProject.project;
  }

  // Check if source file does exist
  if (!fs.existsSync(srcPath)) {
    process.stdout.write('\nSource file doesn\'t exist.'.red + '\nPath: ' + srcPath + '\n');
    return;
  }

  // Prompt the user for the token if it isn't stored in the global config
  let credentials = {};
  try {
    credentials.token = configManager('token');
    credentials.fromConfig = true;
  } catch (e) {
    credentials = await prompts(credentialsPrompt);
  }

  // Get resources to check if the authentication works
  await request.get({
    url: 'https://api.transifex.com/organizations/' + args.o + '/projects/' + args.p + '/resources',
    auth: {
      username: 'api',
      password: credentials.token
    }
  }, async (err, httpResponse, body) => {
    body = JSON.parse(body);
    if (!Array.isArray(body) && typeof body.error_code !== 'undefined') {
      switch (body.error_code) {
        case 'authentication_failed':
          let err;
          credentials.fromConfig ? err = 'Authentication failed, the token saved in your config is invalid.' : err = 'Authentication failed, the token is invalid.';
          process.stdout.write(err.red + '\n'.red);
          break;
        case 'not_found':
          process.stdout.write('No project found with organization slug '.red + args.o + ' and project slug '.red + args.p + '\n');
          break;

        default:
          process.stdout.write('Unhandeled error code: '.red + body.error_code.red + '\n');
      }

      return;
    }

    // List of available resources
    body.forEach((r) => {
      resources.push(r.slug);
    });

    if (resources.length > 0) {
      process.stdout.write('\nCurrently available resources:\n');
      process.stdout.write(resources.join(', ').cyan + '\n\n');
    } else {
      process.stdout.write('\nNo resources available in this project, just create one.\n');
    }

    let resource;
    if (typeof args.r === 'undefined') {
      resource = await prompts(resourcePrompt);
    } else {
      // Check for the correct format
      if (!args.r.match('^[a-zA-Z0-9_-]+:{1}[a-zA-Z0-9_-]+$')) {
        process.stdout.write('\nThe format of the entered resource isn\'t valid, it must be similar to \'Name:Slug\'.'.red);
        process.stdout.write('\nNote: Only alphanumeric characters, underscores _, and dashes - are allowed.'.red);
        return;
      }

      // Split parameter
      let split = args.r.split(':');
      resource = {
        name: split[0],
        slug: split[1]
      };
    }

    if (typeof resource === 'undefined' || typeof resource.name === 'undefined' || typeof resource.slug === 'undefined') {
      return;
    }

    // If resource don't exist, create new transifex resource, otherwise update existing resource
    if (resources.indexOf(resource.slug) < 0) {
      // Create resource
      // TODO Consider adding all language file from older version to have a starting point
      request.post({
        url: 'https://www.transifex.com/api/2/project/' + args.p + '/resources/',
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
      }, (err, httpResponse, body) => {
        // If the language identifier doesn't map, throw an error
        if (body.match('file does not map to source language for the resource')) {
          process.stdout.write('\n' + body.red);
          return;
        }

        // Print success message
        if (!args.q) {
          process.stdout.write('\nResource has been created\n'.cyan);
          process.stdout.write('\nOpen resource in browser: https://transifex.com/' + args.o + '/' + args.p + '/' + resource.slug + '\n');
        }
      });
    } else {
      let confirmation;

      // Confirm automatically if automate is true
      if (args.a) {
        confirmation = true;
      } else {
        let confirmationPrompt = await prompts(confirmPrompt);
        confirmation = confirmationPrompt.confirm;
      }

      if (confirmation) {
        request.put({
          url: 'https://www.transifex.com/api/2/project/' + args.p + '/resource/' + resource.slug + '/content/',
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
