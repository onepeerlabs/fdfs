const core = require('@actions/core');
const os = require('os');
const { spawn } = require('child_process');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data')
const {findFilesToUpload} = require("./search");
const path = require("path");
const cookieJar = {
  myCookies: undefined,
};

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
  core.info(`starting dfs server`)
  // Start the server
  const command = `dfs`;
  const childProcess = spawn(command, ['server', '--verbosity error','--beeApi', `${bee}`, '--rpc', `${rpc}`, '--network', 'testnet', '--postageBlockId', `${stamp}`, '--cookieDomain', 'localhost'], { detached: true, shell: true });

  childProcess.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });

  childProcess.on('close', (code) => {
    console.log(`server stopped ${code}`);
  });

  return childProcess;
}

async function wait() {
  let response = null;
  while (!response) {
    response = await axios.get('http://localhost:9090');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second before making the next API call
    core.info("Waiting for the server to start...");
  }
  core.info(`got server response:  ${response.data}`);
}

async function userLogin(username, password) {
  try {
    const resp = await axios.post("http://localhost:9090/v2/user/login",  {
      "userName": username,
      "password": password
    }, {
      withCredentials: true,
      headers: {
        "Content-Type" : "application/json",
        "User-Agent" : "fdfs-action",
      }
    })
    if (resp.status >= 200 && resp.status < 300) {
      cookieJar.myCookies = resp.headers['set-cookie'];
      core.info(`user logged in`)
    }
  } catch (err) {
    core.setFailed(`failed to login:  ${err}`);
    throw err
  }
}

async function podOpen(podName) {
  try {
    const resp = await axios.post("http://localhost:9090/v1/pod/open",  {
      "podName": podName
    }, {
      headers: {
        "Content-Type" : "application/json",
        "User-Agent" : "client-examples",
        cookie: cookieJar.myCookies,
      },
      withCredentials: true,
    })
    if (resp.status >= 200 && resp.status < 300) {
      core.info(`pod opened`)
    } else {
      core.setFailed(`pod open failed:  ${resp.data}`)
      throw `pod open failed:  ${resp.data}`
    }
  } catch (err) {
    core.setFailed(`pod open failed:  ${err}`);
    throw err
  }
}

async function mkdir(podName, root, dirPath) {
  try {
    const resp = await axios.post("http://localhost:9090/v1/dir/mkdir", {
      "podName": podName,
      "dirPath": path.join(root, dirPath),
    }, {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "client-examples",
        cookie: cookieJar.myCookies,
      },
      withCredentials: true,
    })
    if (resp.status >= 200 && resp.status < 300) {
      core.info(`created directory:  ${dirPath}`)
    } else {
      core.setFailed(`failed to create directory:  ${resp.data}`)
      throw `failed to create directory:  ${resp.data}`
    }
  } catch (err) {
    core.setFailed(`failed to create directory:  ${err}`)
    throw err
  }
}

async function upload(podName, root, source, fullPath) {
  try {
    const stats = fs.statSync(source);
    const isFile = stats.isFile();

    if (isFile) {
      let formData = new FormData()
      const parent = path.join(root, path.dirname(fullPath));
      const fileName = path.basename(fullPath);
      formData.append("files", fs.createReadStream(source), fileName);
      formData.append("podName", podName);
      formData.append("dirPath", parent);
      formData.append("blockSize", "1Mb");

      const resp = await axios.post("http://localhost:9090/v1/file/upload", formData, {
        withCredentials: true,
        headers: {
          "Content-Type": `multipart/form-data; boundary=${formData._boundary}`,
          "User-Agent": "client-examples",
          cookie: cookieJar.myCookies,
        }
      });

      // Check if the response is an error
      if (resp.status >= 200 && resp.status < 300) {
        core.info(`uploaded file:  ${fullPath}`)
      } else {
        core.setFailed(`failed to upload file:  ${resp.data}`)
        throw `failed to upload file:  ${resp.data}`
      }
    } else {
      core.setFailed(`failed to upload file:  ${source} is not a file`)
      throw `failed to upload file:  ${source} is not a file`
    }
  } catch (err) {
   core.setFailed(`failed to upload file:  ${err}`)
    throw err
  }
}

function removeParentDirectory(parentPath, childPath) {
  let relativePath = path.relative(parentPath, childPath);
  relativePath = relativePath === "" ? "/" : relativePath;
  return relativePath.startsWith('..') ? null : "/"+relativePath;
}

async function move(podName, source, destination) {
  try {
    const searchResult = await findFilesToUpload(source)
    if (searchResult.filesToUpload.length > 1000) {
      core.warning(
          `There are over 10000 files in this path, consider creating having a smaller directory structure`
      )
      return
    }
    await Promise.all(searchResult.filesToUpload.map(async f => {
      const stats = fs.statSync(f);
      if (stats.isFile()) {
        core.info(`uploading file ${f} to ${removeParentDirectory(searchResult.rootDirectory, f)}`)
        await upload(podName, destination, f, removeParentDirectory(searchResult.rootDirectory, f))
      } else if (stats.isDirectory()) {
        core.info(`creating directory ${f} to ${removeParentDirectory(searchResult.rootDirectory, f)}`)
        await mkdir(podName, destination, removeParentDirectory(searchResult.rootDirectory, f))
      }
    }))
    core.info(
        `${searchResult.rootDirectory} has been successfully uploaded!`
    )
  } catch (err) {
    core.setFailed(`failed to move:  ${err}`)
    throw err
  }
}

module.exports = { getDownloadObject, startDfs, wait, userLogin, podOpen, move }
