const { BuildProcess } = require('./build_tool');
const { validateDirectory, getProjectDefinition, fetchParameters } = require('../util/params');
const { clean, buildAppLib, createApk } = require('../util/build_apk');
const cacheSchema = require('../schemas/cache.schema');

const validateProject = {
  name: 'Validate project',
  execute: async function() {
    if(!validateDirectory(process.cwd())) {
      return { success: false, message: 'Invalid project config.' }; 
    }
    
    this.projectDefinition = getProjectDefinition(process.cwd());

    return { success: true, message: 'Valid project definition file found.' };
  }
};

const getCache = {
  name: 'Get build parameters',
  execute: async function() {
    const params = await fetchParameters(process.cwd());

    if(!cacheSchema.validateCache(params)) {
      return { success: false, message: 'Invalid parameter cache.' };
    }

    this.sdkLocations = params;

    return { success: true, message: 'Valid parameter cache found.' };
  }
};

const cleanBuild = {
  name: 'Clean build products',
  execute: async function() {
    clean(process.cwd());
    return { success: true, message: 'Successfully cleaned build products.' };
  }
}

const buildAppLibrary = {
  name: 'Build application',
  execute: async function(params) {
    const { success, message } = await buildAppLib(process.cwd(), this.sdkLocations, this.projectDefinition, params.devlib);
    return { success: success, message: message };
  }
};

const makeApk = {
  name: 'Create apk',
  execute: async function(params) {
    const { success, message } = await createApk(process.cwd(), this.sdkLocations, this.projectDefinition, params.devlib);
    return { success: success, message: message };
  }
};

class AndroidApkBuild extends BuildProcess {
  constructor() {
    super();
    this.registerBuildStep(validateProject);
    this.registerBuildStep(getCache);
    this.registerBuildStep(cleanBuild);
    this.registerBuildStep(buildAppLibrary);
    this.registerBuildStep(makeApk);
  }
}

module.exports = { AndroidApkBuild };