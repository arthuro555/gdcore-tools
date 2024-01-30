const { getFetchConfiguration } = require("./downloadGD");
const WrappedGD = require("./WrappedGD");

/**
 * @typedef {{ versionTag?: string, user?: string, fetchProvider?: import("./downloadGD").GdFetchDataProvider, authToken?: string }} LoadGDOptions
 * @property {string} [versionTag] The version of GDevelop to load.
 * @property {string} [user] The GitHub user of GDevelop project.
 * @property {string} [authToken] The GitHub token for GitHub API authorization.
 * @property {import("./downloadGD").GdFetchDataProvider} [fetchProvider] The fetch options.
 */

/**
 * @param {LoadGDOptions | string} [loadOptions] Optional loading configuration or GitHub release tag.
 */
const loadGD = async (loadOptions) => {  
  fetchOptions = await getFetchConfiguration(loadOptions || {});

  return new Promise((resolve, reject) => {
    const wgd = new WrappedGD(fetchOptions);
    wgd.once("ready", () => {
      wgd.removeAllListeners();
      resolve(wgd);
    });
    wgd.once("initError", reject);
  });
};

module.exports = loadGD;
