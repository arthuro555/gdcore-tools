const { getFetchConfiguration } = require("./downloadGD");
const WrappedGD = require("./WrappedGD");

/**
 * @param {{ versionTag?: string, user?: string, fetchProvider?: GdFetchDataProvider, authToken?: string } | string} [options] Optional fetch configuration or github release tag.
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
