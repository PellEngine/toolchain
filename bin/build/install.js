const { BuildProcess } = require('./build_tool');

const { validateDirectory, getProjectDefinition } = require('../util/params');
const { installApk } = require('../util/devices');

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

const install = {
  name: 'Install development app',
  execute: async function(params) {
    const device = params.device;
    const deviceType = device.charAt(0);
    const deviceId = device.slice(1);

    if(deviceType === 'A') {
      const { success, message} = await installApk(process.cwd(), this.projectDefinition, deviceId);
      return { success: success, message: message };
    }

    return { success: false, message: 'Couldnt find device with id ' + device };
  }
};

class InstallApp extends BuildProcess {
  constructor() {
    super();
    this.registerBuildStep(validateProject);
    this.registerBuildStep(install);
  }
}

module.exports = { InstallApp };