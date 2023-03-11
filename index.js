const path = require('path');
const core = require('@actions/core');
const tc = require('@actions/tool-cache');
const { getDownloadObject } = require('./lib/utils');

async function setup() {
  try {
    // Get version of tool to be installed
    const version = core.getInput('version');
    console.log(`setup Version: ${ version }`)
    // Download the specific version of the tool, e.g. as a tarball/zipball
    const download = getDownloadObject(version);
    console.log(`setup Download url: ${ download.url }`)
    console.log(`setup Download binPath: ${ download.binPath }`)
    const pathToTarball = await tc.downloadTool(download.url);
    console.log(`setup pathToTarball: ${ pathToTarball }`)

    // Extract the tarball/zipball onto host runner
    const pathToCLI = await tc.extractZip(pathToTarball);
    console.log(`setup pathToC  LI: ${ pathToCLI }`)
    // Expose the tool by adding it to the PATH
    core.addPath(path.join(pathToCLI, download.binPath));
    console.log(`setup path.join(pathToCLI, download.binPath): ${ path.join(pathToCLI, download.binPath) }`)
  } catch (e) {
    core.setFailed(e);
  }
}

module.exports = setup

if (require.main === module) {
  setup();
}
