// shamelessly copied from @actions/upload-artifact
//
const glob = require('@actions/glob');
const path = require('path');
const {debug, info} = require('@actions/core');
const {stat} = require('fs');
const {dirname} = require('path');
const {promisify} = require('util');
const stats = promisify(stat)

function getDefaultGlobOptions() {
  return {
    followSymbolicLinks: true,
    implicitDescendants: true,
    omitBrokenSymbolicLinks: true
  }
}

/**
 * If multiple paths are specific, the least common ancestor (LCA) of the search paths is used as
 * the delimiter to control the directory structure for the artifact. This function returns the LCA
 * when given an array of search paths
 *
 * Example 1: The patterns `/foo/` and `/bar/` returns `/`
 *
 * Example 2: The patterns `~/foo/bar/*` and `~/foo/voo/two/*` and `~/foo/mo/` returns `~/foo`
 */
function getMultiPathLCA(searchPaths) {
  if (searchPaths.length < 2) {
    throw new Error('At least two search paths must be provided')
  }

  const commonPaths = []
  const splitPaths = []
  let smallestPathLength = Number.MAX_SAFE_INTEGER

  // split each of the search paths using the platform specific separator
  for (const searchPath of searchPaths) {
    debug(`Using search path ${searchPath}`)

    const splitSearchPath = path.normalize(searchPath).split(path.sep)

    // keep track of the smallest path length so that we don't accidentally later go out of bounds
    smallestPathLength = Math.min(smallestPathLength, splitSearchPath.length)
    splitPaths.push(splitSearchPath)
  }

  // on Unix-like file systems, the file separator exists at the beginning of the file path, make sure to preserve it
  if (searchPaths[0].startsWith(path.sep)) {
    commonPaths.push(path.sep)
  }

  let splitIndex = 0
  // function to check if the paths are the same at a specific index
  function isPathTheSame() {
    const compare = splitPaths[0][splitIndex]
    for (let i = 1; i < splitPaths.length; i++) {
      if (compare !== splitPaths[i][splitIndex]) {
        // a non-common index has been reached
        return false
      }
    }
    return true
  }

  // loop over all the search paths until there is a non-common ancestor or we go out of bounds
  while (splitIndex < smallestPathLength) {
    if (!isPathTheSame()) {
      break
    }
    // if all are the same, add to the end result & increment the index
    commonPaths.push(splitPaths[0][splitIndex])
    splitIndex++
  }
  return path.join(...commonPaths)
}

async function findFilesToUpload(
  searchPath,
  globOptions,
) {
  const searchResults = []
  const globber = await glob.create(
    searchPath,
    globOptions || getDefaultGlobOptions()
  )
  const rawSearchResults = await globber.glob()

  /*
    Files are saved with case insensitivity. Uploading both a.txt and A.txt will files to be overwritten
    Detect any files that could be overwritten for user awareness
  */
  const set = new Set()

  /*
    Directories will be rejected if attempted to be uploaded. This includes just empty
    directories so filter any directories out from the raw search results
  */
  for (const searchResult of rawSearchResults) {
    // const fileStats = await stats(searchResult)
    // // isDirectory() returns false for symlinks if using fs.lstat(), make sure to use fs.stat() instead
    // if (!fileStats.isDirectory()) {
    //   debug(`File:${searchResult} was found using the provided searchPath`)
    //   searchResults.push(searchResult)
    //
    //   // detect any files that would be overwritten because of case insensitivity
    //   if (set.has(searchResult.toLowerCase())) {
    //     info(
    //       `Uploads are case insensitive: ${searchResult} was detected that it will be overwritten by another file with the same path`
    //     )
    //   } else {
    //     set.add(searchResult.toLowerCase())
    //   }
    // } else {
    //   debug(
    //     `Removing ${searchResult} from rawSearchResults because it is a directory`
    //   )
    // }

    debug(`File:${searchResult} was found using the provided searchPath`)
    searchResults.push(searchResult)

    // detect any files that would be overwritten because of case insensitivity
    if (set.has(searchResult.toLowerCase())) {
      info(
          `Uploads are case insensitive: ${searchResult} was detected that it will be overwritten by another file with the same path`
      )
    } else {
      set.add(searchResult.toLowerCase())
    }
  }

  // Calculate the root directory for the artifact using the search paths that were utilized
  const searchPaths = globber.getSearchPaths()

  if (searchPaths.length > 1) {
    info(
      `Multiple search paths detected. Calculating the least common ancestor of all paths`
    )
    const lcaSearchPath = getMultiPathLCA(searchPaths)
    info(
      `The least common ancestor is ${lcaSearchPath}. This will be the root directory of the artifact`
    )

    return {
      filesToUpload: searchResults,
      rootDirectory: lcaSearchPath
    }
  }

  /*
    Special case for a single file artifact that is uploaded without a directory or wildcard pattern. The directory structure is
    not preserved and the root directory will be the single files parent directory
  */
  if (searchResults.length === 1 && searchPaths[0] === searchResults[0]) {
    return {
      filesToUpload: searchResults,
      rootDirectory: dirname(searchResults[0])
    }
  }

  return {
    filesToUpload: searchResults,
    rootDirectory: searchPaths[0]
  }
}

module.exports = { findFilesToUpload }
