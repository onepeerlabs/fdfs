const core = require('@actions/core');
const tc = require('@actions/tool-cache');

const { getDownloadObject, startDfs, wait, userLogin, move } = require('./lib/utils');

async function setup() {
  try {
    // Get version of tool to be installed
    const version = core.getInput('version');
    const downloadURL = getDownloadObject(version);
    const pathToTarball = await tc.downloadTool(downloadURL);

    const pathToCLI = await tc.extractZip(pathToTarball);
    core.addPath(pathToCLI);
    const bee = process.env.BEE
    const rpc = process.env.RPC
    const stamp = process.env.STAMP
    const username = process.env.USER_NAME
    const password = process.env.PASSWORD
    const pod = process.env.POD
    let destination = process.env.ROOT || "/"
    if (bee == null || bee === "") {
      core.setFailed("Environment variable BEE is not set")
      return
    }
    if (rpc == null || rpc === "") {
      core.setFailed("Environment variable RPC is not set")
      return
    }
    if (stamp == null || stamp === "") {
      core.setFailed("Environment variable STAMP is not set")
      return
    }
    if (username == null || username === "") {
      core.setFailed("Environment variable USER_NAME is not set")
      return
    }
    if (password == null || password === "") {
    core.setFailed("Environment variable PASSWORD is not set")
      return
    }
    if (pod == null || pod === "") {
      core.setFailed("Environment variable POD is not set")
      return
    }
    if (destination === "") {
        destination = "/"
    }

    const dfsProcess = await startDfs(bee, rpc, stamp);
    await wait();
    await userLogin(username, password);
    const sourcePath = core.getInput('path', {required: true});

    await move(pod, sourcePath, destination);
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait for 1 second before making the next API call

    dfsProcess.unref();
    process.exit();
  } catch (e) {
    core.setFailed(e);
  }
}

module.exports = setup

if (require.main === module) {
  setup().then(r => console.log(r));
}
