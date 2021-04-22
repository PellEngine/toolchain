const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const appSchema = require('../schemas/app.schema');
const cacheSchema = require('../schemas/cache.schema');

const validateDirectory = (directory) => {
  // Check if we have a valid pellengine.json file
  const appConfig = path.join(directory, 'pellengine.json');
  if(!fs.existsSync(appConfig)) {
    return false;
  }

  const appConfigContent = fs.readFileSync(appConfig);

  if(!appSchema.validateAppConfig(JSON.parse(appConfigContent))) {
    return false;
  }

  return true;
};

const getProjectDefinition = (directory) => {
  const appConfigPath = path.join(directory, 'pellengine.json');
  const exists = fs.existsSync(appConfigPath);

  const content = exists ? fs.readFileSync(appConfigPath) : '{}';
  const appConfig = JSON.parse(content);

  return appConfig;
}

const fetchParameters = async (directory) => {
  // Read cache, find missing parameters and in that case prompt for them.
  const cachePath = path.join(directory, '.pellengine-cache.json');
  const exists = fs.existsSync(cachePath);

  const cacheContent = exists ? fs.readFileSync(cachePath) : '{}';
  let cache = JSON.parse(cacheContent);

  let prompt = inquirer.createPromptModule();
  let questions = [];

  for(let property of Object.keys(cacheSchema.cacheSchema.properties)) {
    if(!cache[property]) {
      questions.push({
        type: 'input',
        name: property,
        message: 'Missing property ' + property + ':'
      });
    }
  }
  
  if(questions.length > 0) {
    const result = await prompt(questions);
    cache = {
      ...cache,
      ...result
    };
    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
  }

  return cache;
};

module.exports = {
  validateDirectory,
  getProjectDefinition,
  fetchParameters
};