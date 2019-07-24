require('colors');

const configManager = require('../util/configManager');
const fs = require('fs');
const path = require('path');
const prompts = require('prompts');
const request = require('request-promise-native');

module.exports = async function(args) {
  let options;
  let i18nType = 'XLIFF';
  let resources = [];

  // Set working directory
  let workingDir = process.cwd();

  // If config is defined, paths should be relative to the config file
  if (typeof args.config !== 'undefined') {
    workingDir = path.join(workingDir, path.dirname(args.config));
  }

  let srcPath = path.join(workingDir, args.srcDir, args.srcFile);

  // Prompts
  let credentialsPrompt = [{
    type: 'text',
    name: 'token',
    message: 'Enter transifex token: '
  }];
  let organizationPrompt = [{
    type: 'text',
    name: 'organization',
    message: 'Enter the name of the organization: ',
    validate: organization => organization.match(/^[a-zA-Z0-9_-]+$/) ? true : 'Only alphanumeric characters, underscores _, and dashes - are allowed'
  }];
  let projectPrompt = [{
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

  // Check if organization is set
  if (typeof args.o === 'undefined') {
    args.o = (await prompts(organizationPrompt)).organization;
  }

  // Check if the project slug is set
  if (typeof args.p === 'undefined') {
    args.p = (await prompts(projectPrompt)).project;
  }

  // Check if source file does exist
  if (!fs.existsSync(srcPath)) {
    process.stdout.write('\n    Source file doesn\'t exist.'.red + '\n    Path: ' + srcPath + '\n\n');
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
  try {
    options = {
      url: 'https://api.transifex.com/organizations/' + args.o + '/projects/' + args.p + '/resources',
      auth: {
        username: 'api',
        password: credentials.token
      },
      json: true
    };

    let response = await request(options);

    // Store avaiable resources in a list
    for (let r of response) {
      resources.push(r.slug);
    }
  } catch (e) {
    switch (e.error.error_code) {
      case 'authentication_failed':
        credentials.fromConfig ?
          process.stdout.write('\n    Authentication failed: '.red + 'The token saved in your config is invalid.\n\n') :
          process.stdout.write('\n    Authentication failed: '.red + 'The entered token is invalid.\n\n');
        break;
      case 'not_found':
        process.stdout.write('\n    No project found with organization slug '.red + args.o + ' and project slug '.red + args.p + '\n\n');
        break;

      default:
        process.stdout.write(('\n    An error occurred while pulling the requested resources: ' + e.error.detail + '\n\n').red);
    }
    return;
  }

  // List already existing resources
  if (resources.length > 0) {
    process.stdout.write('\n    Currently available resources:');
    process.stdout.write('\n    ' + resources.join(', ').cyan + '\n');
  } else {
    process.stdout.write('\n    No resources available in this project, just create one.\n');
  }

  // Request the information for the resource that will be created
  let resource;
  if (typeof args.r === 'undefined') {
    resource = await prompts(resourcePrompt);
  } else {
    // Check for the correct format
    if (!args.r.match('^[a-zA-Z0-9_-]+:{1}[a-zA-Z0-9_-]+$')) {
      process.stdout.write('\n    The format of the entered resource isn\'t valid, it must be similar to \'Name:Slug\'.'.red);
      process.stdout.write('\n    Note: Only alphanumeric characters, underscores _, and dashes - are allowed.\n\n'.red);
      return;
    }

    // Split parameter
    let split = args.r.split(':');
    resource = {
      name: split[0],
      slug: split[1]
    };
  }

  // Check if all resource information have been entered
  if (typeof resource === 'undefined' || typeof resource.name === 'undefined' || typeof resource.slug === 'undefined') {
    return;
  }

  // If resource don't exist, create new transifex resource, otherwise update existing resource
  if (resources.indexOf(resource.slug) < 0) {
    // Try to create resource
    // TODO Consider adding all language file from older version to have a starting point
    try {
      options = {
        url: 'https://www.transifex.com/api/2/project/' + args.p + '/resources/',
        method: 'POST',
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
      };
      await request(options);
    } catch (e) {
      process.stdout.write('\n    ' + e.error.red + '\n\n');
      return;
    }

    // Print success message
    if (!args.q) {
      process.stdout.write('\n    Resource '.green + '\'' + resource.slug + '\'' + ' has been created'.green);
      process.stdout.write('\n    Open resource in browser: https://transifex.com/' + args.o + '/' + args.p + '/' + resource.slug + '\n\n');
    }
  } else {
    // Confirm update
    let confirmation;

    // Confirm automatically if automate is true
    if (args.a) {
      confirmation = true;
    } else {
      let confirmationPrompt = await prompts(confirmPrompt);
      confirmation = confirmationPrompt.confirm;
    }

    // Try to update resource
    let response;
    try {
      options = {
        url: 'https://www.transifex.com/api/2/project/' + args.p + '/resource/' + resource.slug + '/content/',
        method: 'PUT',
        formData: {
          file: fs.createReadStream(srcPath),
        },
        auth: {
          username: 'api',
          password: credentials.token
        },
        json: true
      };
      response = await request(options);
    } catch (e) {
      process.stdout.write('\n    Error: '.red + e.error + '\n\n');
      return;
    }

    // Success message
    if (!args.q) {
      process.stdout.write('\n    Resource '.green + '\'' + resource.slug + '\'' + ' has been updated'.green);
      process.stdout.write('\n    Strings added:   ' + response.strings_added);
      process.stdout.write('\n    Strings updated: ' + response.strings_updated);
      process.stdout.write('\n    Strings deleted: ' + response.strings_delete + '\n');
      process.stdout.write('\n    Open resource in browser: https://transifex.com' + response.redirect + '\n\n');
    }
  }
};
