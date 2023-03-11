const os = require('os');
const path = require('path');

// arch in [arm, x32, x64...] (https://nodejs.org/api/os.html#os_os_arch)
// return value in [amd64, 386, arm]
function mapArch(arch) {
  const mappings = {
    arm: 'arm64',
    x64: 'amd64'
  };
  return mappings[arch] || arch;
}

// os in [darwin, linux, win32...] (https://nodejs.org/api/os.html#os_os_platform)
// return value in [darwin, linux, windows]
function mapOS(os) {
  const mappings = {
    darwin: 'darwin',
    win32: 'windows',
    linux: 'linux'
  };
  return mappings[os] || os;
}

function getDownloadObject(version) {
  const platform = os.platform();
  console.log(`Platform: ${ platform }`);
  const filename = `dfs_v${ version }_${ mapOS(platform) }_${ mapArch(os.arch()) }`;
  console.log(`Filename: ${ filename }`);
  const binPath = filename;
  console.log(`Bin path: ${ binPath }`);
  const url = `https://github.com/fairDataSociety/fairOS-dfs/releases/download/v${ version }/${ filename }.zip`;
  console.log(`URL: ${ url }`);
  return {
    url,
    binPath
  };
}

module.exports = { getDownloadObject }
