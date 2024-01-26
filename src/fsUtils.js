const fs = require("fs-extra-promise");
const https = require("https");
const path = require("path");
const StreamZip = require("node-stream-zip");
const { findLatestRelease } = require("./gitUtils");

/**
 * @param {string} user User to get path to versions of.
 * @returns {string} Path to specific user Gdevelop versions folder. 
 */
const getUserPath = (user) => path.join(__dirname, "Versions", user);

/**
 * @param {string} version Version to get path to.
 * @param {string} user User to get path to version of.
 * @returns {string} Path to specific Gdevelop version folder. 
 */
const getRuntimePath = (version, user) => path.join(getUserPath(user), version);

/**
 * @param {string} user User to get latest Gdevelop version of.
 * @param {string} [authToken] Github private token for autorization. 
 * @returns {Promise<string>} Promisified latest available version for specified user.
 */
const findLatestVersion = async (user, authToken) => {
  console.info(`🕗 Getting latest release tag...`);
  return (
    findLatestRelease(user, authToken)
      .catch(() => {
        console.error("❌ Couldn't fetch latest version, using latest local version.");
        fs.readdirAsync(getUserPath(user))
          .then((versions) => resolve(versions[0]))
          .catch(() => {
            console.error("💀 Fatal Error! Couldn't find or download the latest version.");
            reject();
          });
      })
  )
}

/**
 * @param {string} file File url to download.
 * @param {string} savePath Path to save downloaded file.
 * @param {boolean} required Defines if need to throw if loading error occurs. Throw if true is passed.
 */
const downloadFile = (file, savePath, required = true) =>
  new Promise((resolve) => {
    https.get(file, function (response) {
      if (response.statusCode !== 200) {
        if (required) throw new Error(`❌ Cannot download ${file}! Error ${response.statusCode}: ${response.statusMessage}`);
        // Silently fail if the file is not required
        else return resolve(true);
      }
      response.pipe(fs.createWriteStream(savePath)).addListener("close", () => {
        resolve();
      });
    });
  });

const getDir = (pathToFile) => path.extname(pathToFile) ? path.dirname(pathToFile) : pathToFile;

/**
 * Extracts Runtime sources from GDevelop github release archive.
 * @param {string} zipPath Path to Gdevelop zip archive.
 * @param {string} savePath Path to save extracted Runtime sources folder to.
 * @param {string} prefixUser Github user of GDevelop github release archive.
 */
const extractGdRuntimes = async (zipPath, savePath, prefixUser) => {
  const zip = new StreamZip.async({
    file: zipPath,
    storeEntries: true,
  });
  const prefix = `${prefixUser}-GDevelop-${(await zip.comment).slice(0, 7)}`;
  const runtimesPaths = {
    "GDJS/Runtime": "Runtime",
    "Extensions": "Runtime/Extensions",
  };

  try {
    for (const relatedPathToExtract in runtimesPaths) {
      const saveDir = savePath + "/" + getDir(runtimesPaths[relatedPathToExtract]);

      await fs.ensureDir(saveDir);
      await zip.extract(prefix + "/" + relatedPathToExtract, saveDir);
    }
    await zip.close();
  } catch (err) {
    console.error("❌ Error while extracting the GDevelop archive! ", e);
  }
}


module.exports = {
  getUserPath,
  getRuntimePath,
  downloadFile,
  extractGdRuntimes,
  findLatestVersion,
};