const path = require('path');
const fs = require('fs');
const fsExtra = require('fs-extra');
const chalk = require('chalk');
const os = require('os');
const exec = require('./exec');
const extract = require('extract-zip');
const AdmZip = require('adm-zip');

const infoChalk = chalk.cyan;

const infoLog = (msg) => console.log(infoChalk('[X] ' + msg));
const stepLog = (msg) => console.log(msg);

const clean = (directory) => {
  const buildDir = path.join(directory, 'build');
  if(fs.existsSync(buildDir)) fs.rmdirSync(buildDir, { recursive: true });  
};

const buildAppLib = async (directory, sdkLocations, projectDefinition, devlib) => {
  const buildDir = path.join(directory, 'build', 'android');

  const architectures = [
    'arm64-v8a',
    'armeabi-v7a',
    'x86',
    'x86_64'
  ];

  const libFolders = {
    'arm64-v8a': 'aarch64-linux-android/' + projectDefinition.androidVersion,
    'armeabi-v7a': 'armv7a-linux-androideabi/' + projectDefinition.androidVersion,
    'x86': 'i686-linux-android/' + projectDefinition.androidVersion,
    'x86_64': 'x86_64-linux-android/' + projectDefinition.androidVersion
  };

  const compilers = {
    'arm64-v8a': `aarch64-linux-android${projectDefinition.androidVersion}-clang++`,
    'armeabi-v7a': `armv7a-linux-androideabi${projectDefinition.androidVersion}-clang++`,
    'x86': `i686-linux-android${projectDefinition.androidVersion}-clang++`,
    'x86_64': `x86_64-linux-android${projectDefinition.androidVersion}-clang++`
  };

  infoLog('Setting up build directory...');
  architectures.map(arch => path.join(buildDir, 'lib', arch)).forEach(buildFolder => fs.mkdirSync(buildFolder, { recursive: true }));
  architectures.map(arch => path.join(buildDir, 'obj', arch)).forEach(objectFolder => fs.mkdirSync(objectFolder, { recursive: true }));

  const ndk = sdkLocations.androidNdk;
  const platform = os.platform();
  let osName;

  if(platform === 'linux') {
    osName = 'linux-x86_64';
  } else if(platform === 'win32') {
    osName = 'windows-x86_64';
  } else if(platform === 'darwin') {
    osName = 'darwin-x86_64';
  }

  const cFlags = [
    '-fpic',
    '-ffunction-sections',
    '-Os',
    '-fdata-sections',
    '-Wall',
    '-fvisibility=hidden',
    '-D ANDROID',
    `-D APPNAME=\"${projectDefinition.name}"`,
    '-D ANDROID_FULLSCREEN',
    `-I${path.join(ndk, 'sysroot', 'usr', 'include').toString()}`,
    `-I${path.join(ndk, 'sysroot', 'usr', 'include', 'android').toString()}`,
    `-I${path.join(ndk, 'toolchains', 'llvm', 'prebuilt', osName, 'sysroot', 'usr', 'include', 'android').toString()}`,
    `${devlib ? `-I${path.join(directory, '..', 'core', 'src').toString()}` : ''}`, 
    '-c',
    '-D DEBUG',
    '-D PLATFORM="ANDROID"',
    '-DVK_USE_PLATFORM_ANDROID_KHR',
    '-std=c++17'
  ];

  const archFlags = {
    'arm64-v8a': [
      '-m64'
    ],
    'armeabi-v7a': [
      '-mfloat-abi=softfp',
      '-m32'
    ],
    'x86': [
      '-march=i686',
      '-mtune=intel',
      '-mssse3',
      '-mfpmath=sse',
      '-m32'
    ],
    'x86_64': [
      '-march=x86-64',
      '-msse4.2',
      '-mpopcnt',
      '-m64',
      '-mtune=intel'
    ]
  };

  const ldFlags = [
    '-shared',
    `-Wl,--gc-sections`,
    '-s',
    '-lm',
    '-landroid',
    '-lpellengine',
    '-llog',
    '-uANativeActivity_onCreate'
  ];
  const compilersRoot = path.join(ndk, 'toolchains', 'llvm', 'prebuilt', osName, 'bin');

  for(let arch of architectures) {
    console.log();
    infoLog('Building for ' + arch);

    const compilerPath = path.join(compilersRoot, compilers[arch]);
    if(!fs.existsSync(compilerPath)) {
      return { success: false, message: `Compiler for ${arch} was not found.` };
    }
    stepLog('Compiler found at path: ' + compilerPath);
    stepLog('Compiling...');
    console.log();

    const srcs = [
      ...projectDefinition.src,
      ...projectDefinition.androidSrc
    ];

    for(let src of srcs) {
      stepLog('Compiling ' + src);

      const objectPath = src.substr(0, src.lastIndexOf('.')) + '.o';
      fs.mkdirSync(path.dirname(path.join(buildDir, 'obj', arch, src)), { recursive: true });

      let command = `${compilerPath} ${cFlags.join(' ')} ${archFlags[arch].join(' ')} `;
      command += `-o ${path.join(buildDir, 'obj', arch, objectPath)} `;
      command += `${src}`;

      stepLog(await exec(command));
      console.log();
    }

    infoLog('Linking for ' + arch);
    
    let command = `${compilerPath} ${ldFlags.join(' ')} `;
    command += `-L${path.join(ndk, 'toolchains', 'llvm', 'prebuilt', osName, 'sysroot', 'usr', 'lib', libFolders[arch]).toString()} `;

    if(devlib) {
      command += `-L${path.join(directory, '..', 'core', 'build', 'android', 'lib', arch).toString()} `;
    }

    command += `-o ${path.join(buildDir, 'lib', arch, `lib${projectDefinition.name}.so`).toString()} `
    command += `${srcs.map(src => {
      const objectPath = src.substr(0, src.lastIndexOf('.')) + '.o';
      return path.join(buildDir, 'obj', arch, objectPath).toString()
    }).join(' ')}`;

    stepLog(await exec(command));
  }
  
  console.log();
  return { success: true, message: 'Successfully built application.' };
};

const createApk = async (directory, sdkLocations, projectDefinition, devlib) => {
  const buildDir = path.join(directory, 'build', 'android');

  infoLog('Copying assets...');
  fs.mkdirSync(path.join(buildDir, 'assets'));
  fs.mkdirSync(path.join(buildDir, 'outputs'));
  fs.mkdirSync(path.join(buildDir, 'outputs', projectDefinition.name))
  
  if(fs.existsSync(path.join(directory, 'assets'))) {
    fsExtra.copySync(path.join(directory, 'assets').toString(), path.join(buildDir, 'assets').toString());
  }

  // If we are developing the api, copy the shaders provided by the library from the local build folder
  if(devlib) {
    const pellengineShadersBasePath = path.join(directory, '..', 'core', 'build', 'shaders');

    fsExtra.copySync(
      pellengineShadersBasePath.toString(),
      path.join(buildDir, 'assets', 'shaders').toString()
    );
  }

  const aaptPath = path.join(sdkLocations.androidBuildTools, 'aapt');
  
  infoLog('Creating temporary apk...');
  
  let command = `${aaptPath} package -f -F ${path.join(buildDir, 'outputs', 'temp.apk')} `;
  command += `-I ${path.join(sdkLocations.androidSdk, 'platforms', `android-${projectDefinition.androidVersion}`, 'android.jar')} `;
  command += '-M AndroidManifest.xml ';
  command += `-S ${path.join(directory, 'assets', 'res')} `;
  command += `-A ${path.join(buildDir, 'assets')} `;
  command += `-v --target-sdk-version ${projectDefinition.androidVersion}`;

  stepLog(await exec(command));

  infoLog('Unzipping temp apk...');

  try {
    await extract(path.join(buildDir, 'outputs', 'temp.apk').toString(), { dir: path.join(buildDir, 'outputs', 'temp-' + projectDefinition.name).toString() });
  } catch(err) {
    return { success: false, message: 'Zip extraction failed.' };
  }

  fsExtra.removeSync(path.join(buildDir, 'outputs', 'temp.apk'));

  infoLog('Copying shared libraries to apk...');

  fsExtra.copySync(path.join(buildDir, 'lib').toString(), path.join(buildDir, 'outputs', 'temp-' + projectDefinition.name, 'lib'));

  // Add libc++_shared.so to apk
  const libcppSharedBasePath = path.join(sdkLocations.androidNdk, 'sources', 'cxx-stl', 'llvm-libc++', 'libs');
  const libpellengineBasePath = path.join(directory, '..', 'core', 'build', 'android', 'lib');

  const architectures = [
    'arm64-v8a',
    'armeabi-v7a',
    'x86',
    'x86_64'
  ];

  for(let arch of architectures) {
    fsExtra.copyFileSync(
      path.join(libcppSharedBasePath, arch, 'libc++_shared.so').toString(), 
      path.join(buildDir, 'outputs', 'temp-' + projectDefinition.name, 'lib', arch, 'libc++_shared.so').toString()
    );
  }

  // Add vulkan libraries to apk
  const libVulkanBasePath = path.join(sdkLocations.androidNdk, 'sources', 'third_party', 'vulkan', 'src', 'build-android', 'jniLibs');
  for(let arch of architectures) {
    const libs = fs.readdirSync(path.join(libVulkanBasePath, arch));
    libs.forEach(lib => {
      fsExtra.copyFileSync(
        path.join(libVulkanBasePath, arch, lib).toString(),
        path.join(buildDir, 'outputs', 'temp-' + projectDefinition.name, 'lib', arch, lib).toString()
      )
    });
  }

  // If we have devlib enabled, add shared library from local development folder
  if(devlib) {
    for(let arch of architectures) {
      fsExtra.copyFileSync(
        path.join(libpellengineBasePath, arch, 'libpellengine.so').toString(),
        path.join(buildDir, 'outputs', 'temp-' + projectDefinition.name, 'lib', arch, 'libpellengine.so').toString()
      );
    }
  }

  infoLog('Zipping new apk...');

  let zip = new AdmZip();
  zip.addLocalFolder(path.join(buildDir, 'outputs', 'temp-' + projectDefinition.name).toString());
  zip.writeZip(path.join(buildDir, 'outputs', `temp-${projectDefinition.name}.apk`));

  fs.rmdirSync(path.join(buildDir, 'outputs', 'temp-' + projectDefinition.name), { recursive: true });
  fs.rmdirSync(path.join(buildDir, 'outputs', projectDefinition.name), { recursive: true });

  infoLog('Signing the apk...');

  let jarsignerCommand = 'jarsigner -sigalg SHA256withRSA -digestalg SHA256 -verbose ';
  jarsignerCommand += `-keystore ${sdkLocations.androidKeyStore} `;
  jarsignerCommand += `-storepass ${sdkLocations.androidKeyStorePass} `;
  jarsignerCommand += `${path.join(buildDir, 'outputs', `temp-${projectDefinition.name}.apk`)} `
  jarsignerCommand += sdkLocations.androidKeyStoreAlias;

  stepLog(await exec(jarsignerCommand));

  let zipAlignCommand = `${path.join(sdkLocations.androidBuildTools, 'zipalign')} -v 4 `;
  zipAlignCommand += `${path.join(buildDir, 'outputs', 'temp-' + projectDefinition.name + '.apk')} `;
  zipAlignCommand += `${path.join(buildDir, 'outputs', projectDefinition.name + '.apk')}`;
  stepLog(await exec(zipAlignCommand));

  let apkSignerCommand = `${path.join(sdkLocations.androidBuildTools, 'apksigner')} sign `;
  apkSignerCommand += `--key-pass pass:${sdkLocations.androidKeyStorePass} `;
  apkSignerCommand += `--ks-pass pass:${sdkLocations.androidKeyStorePass} `;
  apkSignerCommand += `--ks ${sdkLocations.androidKeyStore} `;
  apkSignerCommand += `--ks-key-alias ${sdkLocations.androidKeyStoreAlias} `;
  apkSignerCommand += `--min-sdk-version ${projectDefinition.androidVersion} `;
  apkSignerCommand += `${path.join(buildDir, 'outputs', projectDefinition.name + '.apk')}`;
  stepLog(await exec(apkSignerCommand));

  fsExtra.removeSync(path.join(buildDir, 'outputs', 'temp-' + projectDefinition.name + '.apk'));

  return {
    success: true,
    message: 'Successfully created apk'
  };
};

module.exports = {
  clean,
  buildAppLib,
  createApk
};