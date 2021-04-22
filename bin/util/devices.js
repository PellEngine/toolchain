const { Adb } = require('@devicefarmer/adbkit');
const fs = require('fs');
const path = require('path');

const listDevices = async () => {
  const client = Adb.createClient();
  const devices = await client.listDevices();
  return devices.map(device => ({ platform: 'android', ...device }));
};

const installApk = async (directory, projectDefinition, deviceId) => {
  const client = Adb.createClient();
  const devices = await client.listDevices();

  let device;
  for(let d of devices) {
    if(d.id === deviceId) {
      device = d;
      break;
    }
  }

  // Device was not found
  if(!device) {
    return { success: false, message: 'Couldnt find device with id ' + deviceId };
  }

  // Check if we have a apk built
  if(!fs.existsSync(path.join(directory, 'build', 'android', 'outputs', projectDefinition.name + '.apk'))) {
    return { success: false, message: 'Please build the app before trying to install' };
  }

  // Install app
  try {
    await client.getDevice(deviceId).install(path.join(directory, 'build', 'android', 'outputs', projectDefinition.name + '.apk').toString());
    return { success: true, message: 'Successfully installed apk' };
  } catch(err) {
    return { success: false, message: err };
  }
};

module.exports = { listDevices, installApk };