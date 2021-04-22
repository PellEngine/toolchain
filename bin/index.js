#! /usr/bin/env node
const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');
const chalk = require('chalk');

const { AndroidApkBuild } = require('./build/android_build');
const { ListDevices } = require('./build/list_devices');
const { InstallApp } = require('./build/install');

const errorChalk = chalk.red;

const argv = yargs(hideBin(process.argv))
  .usage('Usage: pellengine <command> [options]')
  .scriptName('pellengine')
  .command(
    'build [platform]', 
    '',
    yargs => {
      yargs.positional('platform', {
        describe: '[apk, appbundle, ios, ipa]'
      })
    },
    argv => {
      switch(argv.platform.toLowerCase()) {
        case 'apk':
          const build = new AndroidApkBuild();
          build.run();
          break;

        case 'appbundle':
          break;

        case 'ios':
          break;

        case 'ipa':
          break;

        default:
          console.log(errorChalk('Unsupported platform ' + argv.platform.toLowerCase()));
          break;
      }
    }
  )
  .command(
    'devices',
    '',
    () => {},
    argv => {
      const listDevices = new ListDevices();
      listDevices.run();
    }
  )
  .command(
    'install [device]',
    '',
    yargs => {
      yargs.positional('device', {
        describe: '[Device ID]'
      })
    },
    argv => {
      const install = new InstallApp();
      install.run({ device: argv.device });
    }
  )
  .argv;