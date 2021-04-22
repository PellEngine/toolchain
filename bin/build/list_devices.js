const { BuildProcess } = require('./build_tool');

const { validateDirectory, getProjectDefinition } = require('../util/params');
const { listDevices } = require('../util/devices');

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

const getDevices = {
  name: 'Get devices',
  execute: async function() {
    try {
      const devices = await listDevices();
      
      for(let i=0;i<devices.length;i++) {
        let device = devices[i];
        console.log(`${i+1}) A${device.id} (Android Device)`);
      }
    } catch(err) {
      return { success: false, message: err }; 
    }

    return { success: true, message: '' };
  }
}

class ListDevices extends BuildProcess {
  constructor() {
    super();
    this.registerBuildStep(validateProject);
    this.registerBuildStep(getDevices);
  }
}

module.exports = { ListDevices };