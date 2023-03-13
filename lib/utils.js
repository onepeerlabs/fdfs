const os = require('os');
const { spawn } = require('child_process');
const axios = require('axios');

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
  const command = `dfs`;
  const childProcess = spawn(command, ['server', '--beeApi', `${bee}`, '--rpc', `${rpc}`, '--network', 'testnet', '--postageBlockId', `${stamp}`, '--cookieDomain', 'localhost'], { detached: true, shell: true });

// Add event listeners for stdout, stderr, and close events if needed
  childProcess.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
  });

  childProcess.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });

  childProcess.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
  });

  return childProcess;
}

async function wait() {
  let response = null;
  while (!response) {
    try {
      response = await axios.get('http://localhost:9090');
    } catch (error) {
      console.error(`API call failed: ${error}`);
    }
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second before making the next API call
    console.log("Waiting for the server to start...");
  }
  console.log(`API response: ${response}`);
}

module.exports = { getDownloadObject, startDfs, wait }
