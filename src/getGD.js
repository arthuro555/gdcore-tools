const fs = require("fs-extra-promise");
const path = require("path");
const { getRuntimePath } = require("./fsUtils");
const { downloadVersion } = require("./downloadGD");

/**
 * Initialize libGD.js.
 * If the version is not present, download it.
 * Returning `gd` doesn't work, so a hacky workaround with global is used.
 * @param {{ versionTag: string, user: string, fetchProvider: import("./downloadGD").GdFetchDataProvider, authToken?: string }} fetchOptions Fetch configuration.
 */
module.exports = async function (fetchOptions, gdOptions) {
  const runtimePath = getRuntimePath(fetchOptions.versionTag, fetchOptions.user);
  // Download the version if it isn't present
  if (!fs.existsSync(runtimePath)) {
    console.log("❌ The GDevelop versionTag was not found, downloading it!");

    try {
      await downloadVersion(fetchOptions);
    } catch (err) {
      fs.rmSync(runtimePath, { recursive: true });
      throw err;
    }
  }

  const gd = require(path.join(runtimePath, "libGD.js"))(gdOptions);
  return new Promise((resolve) => {
    gd.then(() => {
      // Make sure gd is not thenable as the promise would think it is one as well.
      delete gd.then;
      resolve(gd);
    });
  });
};