const fs = require("fs-extra-promise");
const path = require("path");
const assert = require("assert");
const { getLatestCiCommit, getAssetsIdsMap, downloadGitBinaryAsset } = require("./gitUtils");
const { findLatestVersion, getRuntimePath, downloadFile, extractGdRuntimes } = require("./fsUtils");

const gdAuthor = "4ian";
const libGdAssets = {
  required: [
    "libGD.js"
  ],
  optional: [
    "libGD.wasm",
    "libGD.js.mem",
  ],
  getAll() {
    return this.required.concat(this.optional);
  },
  isRequired(assetName) {
    return this.required.includes(assetName);
  }
};

/**
 * @typedef {{
 *    'libGD.js': (string) => Promise<void>,
 *    'libGD.wasm'?: (string) => Promise<void>,
 *    'libGD.js.mem'?: (string) => Promise<void>
 *  } | {
 *    libGDPath: string
 *  } | {
 *    useReleaseAssets: true
 *  }
 * } GdFetchDataProvider
 * Fetch configuration that provides methods or url to load libGD assets.
 */

/**
 * Verifies and complements passed fetch configuration object.
 * 
 * @param {{ versionTag?: string, user?: string, fetchProvider?: GdFetchDataProvider, authToken?: string } | string} options Fetch configuration to complete.
 * @returns {Promise<{ versionTag: string, user: string, fetchProvider: GdFetchDataProvider, authToken?: string }>} Complete fetch configuration object.
 */
const getFetchConfiguration = async (options) => {
  if (typeof options === "string") options = { versionTag: options }

  options.user ??= gdAuthor;
  options.versionTag ??= await findLatestVersion(options.user, options.authToken);

  if (options.user === gdAuthor) {
    const { sha } = await getLatestCiCommit(options.versionTag, options.authToken);

    options.fetchProvider = {
      libGDPath: `https://s3.amazonaws.com/gdevelop-gdevelop.js/master/commit/${sha}/`,
    };
  } else {
    assert(options.fetchProvider, "❌ You should pass fetchProvider instance if fork is used.");
    assert(
      libGdAssets.required.every((libGdAsset) => typeof options.fetchProvider[libGdAsset] === "function") ||
      options.fetchProvider.libGDPath ||
      options.fetchProvider.useReleaseAssets,
      `❌ You should provide fetch methods or fetch url for necessary libGD assets: ${libGdAssets.required}.`
    );
  }

  return options;
};

/**
 * Downloads a GDevelop Runtime sources and compile them.
 * 
 * @param {{ versionTag: string, user: string, fetchProvider: GdFetchDataProvider, authToken?: string }} fetchConfiguration Fetch configuration.
 * @param {string} gdPath Path to save Runtime sources folder to.
 */
const downloadGdRuntimes = async ({ versionTag, user }, gdPath) => {
  const zipPath = path.join(gdPath, "gd.zip");
  
  console.info(`🕗 Starting download of GDevelop Runtime '${versionTag}'...`);
  await downloadFile(`https://codeload.github.com/${user}/GDevelop/legacy.zip/${versionTag}`, zipPath);
  console.info(`✅ Done downloading GDevelop Runtime '${versionTag}'`);
  console.info(`🕗 Extracting GDevelop Runtime '${versionTag}'...`);
  await extractGdRuntimes(zipPath, gdPath, user);
  await fs.remove(zipPath);
  console.info(`✅ Done extracting the GDevelop Runtime`);

  if (!fs.existsSync(path.join(gdPath, "Runtime/gd.js"))) {
    console.info(`🕗 Compiling Runtime...`);
    return require("./build")(gdPath);
  }
}

/**
 * Downloads a GDevelop version libGD assets.
 * 
 * @param {{ versionTag: string, user: string, fetchProvider: GdFetchDataProvider, authToken?: string }} fetchOptions Fetch configuration.
 * @param {string} gdPath Path to save libGd assets to.
 */
const downloadLibGdAssets = async function ({ versionTag, user, fetchProvider, authToken }, gdPath) {
  console.info(`🕗 Starting download of GDevelop Core...`);
  if (fetchProvider.useReleaseAssets) {
    console.info(`🕗 Using ${versionTag} release assets...`);
    const assetsIdsMap = await getAssetsIdsMap(user, versionTag, authToken);

    assert(
      libGdAssets.required.every((libGdAsset) => assetsIdsMap[libGdAsset]),
      `❌ Your release do not provide all required libGd assets: ${libGdAssets.required}. Provided: ${Object.values(assetsIdsMap)}.`
    );

    return Promise.all(
      libGdAssets
        .getAll()
        .filter((libGdAsset) => assetsIdsMap[libGdAsset])
        .map(async (libGdAsset) => {
          await downloadGitBinaryAsset(path.join(gdPath, libGdAsset), user, assetsIdsMap[libGdAsset], authToken);
          console.info(`✅ Done downloading ${libGdAsset}`);
        })
    );
  }

  if (fetchProvider.libGDPath) {
    console.info(`🕗 Using ${fetchProvider.libGDPath} url...`);
    return Promise.all(
      libGdAssets
        .getAll()
        .map((libGdAsset) => (
          downloadFile(fetchProvider.libGDPath + libGdAsset, path.join(gdPath, libGdAsset), libGdAssets.isRequired(libGdAsset))
            .then((errored) => !errored && console.info(`✅ Done downloading ${libGdAsset}`))
        ))
    );
  }
  console.info(`🕗 Using provider functions...`);
  return Promise.all(
    libGdAssets
      .getAll()
      .filter((libGdAsset) => fetchProvider[libGdAsset])
      .map(async (libGdAsset) => {
        await fetchProvider[libGdAsset](gdPath);
        console.info(`✅ Loading of '${libGdAsset}' is finished by provider.`);
      })
  );
}

/**
 * Downloads a GDevelop version (libGD.js, the runtime and the extensions).
 * 
 * @param {{ versionTag: string, user: string, fetchProvider: GdFetchDataProvider, authToken?: string }} fetchOptions Fetch configuration.
 */
const downloadVersion = function (fetchOptions) {
  const {
    versionTag,
    user
  } = fetchOptions;
  const gdPath = getRuntimePath(versionTag, user);

  fs.emptyDirSync(gdPath);

  return Promise.all([
    downloadGdRuntimes(fetchOptions, gdPath),
    downloadLibGdAssets(fetchOptions, gdPath),
  ]).then(() =>
    console.info(`✅ Successfully downloaded GDevelop version '${versionTag}'`)
  );
};

module.exports = {
  getFetchConfiguration,
  downloadVersion,
};
