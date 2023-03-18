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
      core.info(`logged in:  ${resp.data}`)
    }
  } catch (err) {
    core.setFailed(`failed to login:  ${err}`);
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
      core.info(`created directory:  ${resp.data}`)
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
        core.info(`uploaded file:  ${resp.data}`)
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
    if (searchResult.filesToUpload.length > 10000) {
      core.warning(
          `There are over 10,000 files in this artifact, consider creating an archive before upload to improve the upload performance.`
      )
      return
    }
    searchResult.filesToUpload.map(f => {
      const stats = fs.statSync(f);
      if (stats.isFile()) {
        console.log("uploading file", f, "to", destination, "pod path", removeParentDirectory(searchResult.rootDirectory, f), "in pod", podName)
        upload(podName, destination, f, removeParentDirectory(searchResult.rootDirectory, f))
      } else if (stats.isDirectory()) {
        console.log("creating directory", f, "to", destination, "pod path", removeParentDirectory(searchResult.rootDirectory, f), "in pod", podName)
        mkdir(podName, destination, removeParentDirectory(searchResult.rootDirectory, f))
      }
    })
    core.info(
        `Artifact ${searchResult.rootDirectory} has been successfully uploaded!`
    )
  } catch (err) {
    core.setFailed(`failed to move:  ${err}`)
    throw err
  }
}

module.exports = { getDownloadObject, startDfs, wait, userLogin, move }
