require('colors');

const configManager = require('../util/configManager');
const fs = require('fs');
const path = require('path');
const prompts = require('prompts');
const request = require('request-promise-native');

module.exports = async function(args) {
  const TRANSIFEX_API_URL = 'https://rest.api.transifex.com';
  // Set working directory
  let workingDir = process.cwd();

  // If config is defined, paths should be relative to the config file
  if (typeof args.config !== 'undefined') {
    workingDir = path.join(workingDir, path.dirname(args.config));
  }

  // Prompts
  let credentialsPrompt = [{
    type: 'text',
    name: 'token',
    message: 'Enter transifex token: '
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
  let languagePrompt = [{
    type: 'text',
    name: 'languages',
    message: 'Enter the list of language codes you want to pull: ',
    validate: languages => languages.match(/^([a-zA-Z-_]{2,},{0,1})+$/) ? true : 'The format must be similar to de_DE,en-GB etc.'
  }];

  // Prompt the user for the token if it isn't stored in the global config
  let credentials = {};
  try {
    credentials.token = configManager('token');
    credentials.fromConfig = true;
  } catch (e) {
    credentials = await prompts(credentialsPrompt);
  }

  // Get project the user want to pull from
  if (typeof args.p === 'undefined') {
    args.p = (await prompts(projectPrompt)).project;
  }

  // Get resource the user want to pull from
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

  // Get list of languages
  let languages;
  if (typeof args.l === 'undefined') {
    languages = (await prompts(languagePrompt)).languages;
  } else {
    languages = args.l;
  }

  // Iterate the list of languages to pull everyone of them
  let count = 0;
  for (let languageCode of languages.split(',')) {
    // Get content of language file
    modifiedLocale = languageCode.replace('-', '_');
    let options = {
      url: `${TRANSIFEX_API_URL}/resource_translations_async_downloads`,
      method: 'POST',
      headers: {
        accept: 'application/vnd.api+json',
        'content-type': 'application/vnd.api+json',
        authorization: `Bearer ${credentials.token}`
      },
      body: {
        data: {
          relationships: {
            language: {
              data: {
                id: `l:${modifiedLocale}`,
                type: 'languages'
              },
            },
            resource: {
              data: {
                id: `o:${args.o}:p:${args.p}:r:${resource.slug}`,
                type: 'resources'
              }
            }
          },
          type: 'resource_translations_async_downloads'
        }
      },
      json: true
    };
    try {
      let response = await request(options);
      download_id = response?.data?.id;

      let download_status_req_options = {
        url: `${TRANSIFEX_API_URL}/resource_translations_async_downloads/${download_id}`,
        method: 'GET',
        headers: {
          accept: 'application/vnd.api+json',
          'content-type': 'application/vnd.api+json',
          authorization: `Bearer ${credentials.token}`
        },
        json: true
      };

      downloading = true;
      let download_response_str = '';

      while (downloading) {
        process.stdout.write('\n    Pulling language \'' + languageCode.cyan + '\'...');
        download_response = await request(download_status_req_options);
        downloading = download_response?.data?.attributes?.status === 'pending' || download_response?.data?.attributes?.status === 'processing';

        // if the download gets completed sent one more request to get the translated texts
        // in plain text format to avoid further processing.
        if (!downloading) {
          let download_status_req_options = {
            url: `${TRANSIFEX_API_URL}/resource_translations_async_downloads/${download_id}`,
            method: 'GET',
            headers: {
              accept: 'application/vnd.api+json',
              'content-type': 'application/vnd.api+json',
              authorization: `Bearer ${credentials.token}`
            }
          };
          download_response_str = await request(download_status_req_options);
        }

      }

      if (download_response?.data?.attributes?.status == 'failed') {
        process.stdout.write('\n Failed to download the translations for \'' + languageCode.cyan + '\' \n')
      } else {
        // Write content to file
        fs.writeFileSync(path.join(workingDir, args.tarDir, path.sep) + 'messages.' + languageCode + '.xlf', download_response_str);
        if (!args.q) {
          process.stdout.write('\n    Pulled language \'' + languageCode.cyan + '\' successfully');
        }
      }

      count++;
    } catch (e) {
      process.stdout.write('\n    An error occurred while processing language \'' + languageCode + '\': ' + e.error?.red);
    }
  }

  // Print summary
  if (!args.q) {
    process.stdout.write('\n\n    Pulled ' + count + ' language files\n\n');
  }
};
