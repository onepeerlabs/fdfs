const core = require('@actions/core');
const tc = require('@actions/tool-cache');
const { getDownloadObject, startDfs } = require('./lib/utils');

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

    console.log(`Bee: ${bee}`);
    console.log(`RPC: ${rpc}`);
    console.log(`STAMP: ${stamp}`);
    await startDfs(bee, rpc, stamp);
  } catch (e) {
    core.setFailed(e);
  }
}

module.exports = setup

if (require.main === module) {
  setup();
}
