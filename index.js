const path = require('path');
const core = require('@actions/core');
const tc = require('@actions/tool-cache');
const { getDownloadObject } = require('./lib/utils');

async function setup() {
  try {
    // Get version of tool to be installed
    const version = core.getInput('version');
    const downloadURL = getDownloadObject(version);
    const pathToTarball = await tc.downloadTool(downloadURL);

    const pathToCLI = await tc.extractZip(pathToTarball);
    core.addPath(pathToCLI);
  } catch (e) {
    core.setFailed(e);
  }
}

module.exports = setup

if (require.main === module) {
  setup();
}
