const os = require('os');
const { exec } = require('child_process');

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
  const filename = `dfs_v${ version }_${ mapOS(platform) }_${ mapArch(os.arch()) }`;
  return `https://github.com/fairDataSociety/fairOS-dfs/releases/download/v${ version }/${ filename }.zip`;
}

function startDfs(bee, rpc, stamp) {
  // Start the server
  const command = `dfs server --beeApi ${bee} --rpc ${rpc} --network testnet --postageBlockId ${stamp} --cookieDomain localhost`;
  exec(command, {}, (error, stdout) => {
    if (error) {
      console.error(`Failed to start server: ${error}`);
      process.exit(1);
    }
    console.log(`Server started: ${stdout}`);
  });
}

module.exports = { getDownloadObject, startDfs }
