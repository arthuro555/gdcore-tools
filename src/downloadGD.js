const fs = require("fs-extra-promise");
const path = require("path");
const { request } = require("@octokit/request");
const { https } = require("follow-redirects");
const assert = require("assert");

const gdAuthor = "4ian";
const libGdAssets = [
  "libGD.js",
  "libGD.wasm",
  "libGD.js.mem",
];
const isRequiredLibGdAssets = (libGdAssets) => libGdAssets === "libGD.js";

const getVersionsPath = () => path.join(__dirname, "Versions");
const getUserPath = (user) => path.join(getVersionsPath(), user);
const getRuntimePath = (version, user) => path.join(getUserPath(user), version);

const getAuthHeader = (authToken) => authToken ? { authorization: authToken } : { };

const downloadFile = (file, savePath, required = true) =>
  new Promise((resolve) => {
    https.get(file, function (response) {
      if (response.statusCode !== 200) {
        if (required)
          throw new Error(
            `❌ Cannot download ${file}! Error ${response.statusCode}: ${response.statusMessage}`
          );
        // Silently fail if the file is not required
        else return resolve(true);
      }
      response.pipe(fs.createWriteStream(savePath)).addListener("close", () => {
        resolve();
      });
    });
  });

const findLatestVersion = (user, authToken) =>
  new Promise((resolve, reject) => {
    // Fetch base release infos
    console.info(`🕗 Getting latest release tag...`);
    return request(`GET /repos/${user}/GDevelop/releases/latest`, {
        headers: getAuthHeader(authToken)
      })
      .then(({ data }) => {
        resolve(data.tag_name);
      })
      .catch(() => {
        console.error("❌ Couldn't fetch latest version, using latest local version.");
        fs.readdirAsync(getUserPath(user))
          .then((versions) => resolve(versions[0]))
          .catch(() => {
            console.error("💀 Fatal Error! Couldn't find or download the latest version.");
            reject();
          });
      });
  });

const extractGdZip = async (
  zipPath,
  savePath,
  prefixUser,
  pathsToExtract,
  pathMapper = (pathToMap) => pathToMap
) => {
  const StreamZip = require("node-stream-zip");
  const zip = new StreamZip.async({
    file: zipPath,
    storeEntries: true,
  });
  const getDir = (pathToFile) => path.extname(pathToFile) ? path.dirname(pathToFile) : pathToFile;
  const prefix = `${prefixUser}-GDevelop-${(await zip.comment).slice(0, 7)}`;

  try {
    for (const relatedPathToExtract of pathsToExtract) {
      const pathToExtract = savePath + "/" + getDir(pathMapper(relatedPathToExtract));

      await fs.ensureDir(pathToExtract);
      await zip.extract(prefix + "/" + relatedPathToExtract, pathToExtract);
    }
    await zip.close();
  } catch (err) {
    console.error("❌ Error while extracting the GDevelop archive! ", e);
  }
}

const getLatestCiCommit = async (versionTag, authToken) => {
  const headers = getAuthHeader(authToken);
  let { data: commit } =
    await request("GET /repos/4ian/GDevelop/commits/{ref}", {
      ref: (
        await request("GET /repos/4ian/GDevelop/git/ref/tags/{tag}", {
          tag: versionTag,
        })
      ).data.object.sha,
      headers,
    });

  // Go up to the latest commit for which libGD.js was built
  while (commit.commit.message.indexOf("[skip ci]") !== -1) {
    commit = (
      await request("GET /repos/4ian/GDevelop/commits/{ref}", {
        ref: commit.parents[0].sha,
        headers,
      })
    ).data;
  }

  return commit;
}

/**
 * @typedef {{
 *    'libGD.js': (string) => Promise<void>,
 *    'libGD.wasm'?: (string) => Promise<void>,
 *    'libGD.js.mem'?: (string) => Promise<void>
 *  } | { libGDPath: string }
 * } GdFetchDataProvider
 * Fetch configuration that provides methods or url to load libGD assets.
 */

/**
 * Verifies and complements passed fetch configuration object.
 * 
 * @param {{ versionTag?: string, user?: string, fetchProvider?: GdFetchDataProvider, authToken?: string } | string} options Fetch configuration to complete.
 * @returns {{ versionTag: string, user: string, fetchProvider: GdFetchDataProvider, authToken?: string }} Complete fetch configuration object.
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
      libGdAssets.every((libGdAsset) =>
        !isRequiredLibGdAssets(libGdAsset) ||
        typeof options.fetchProvider[libGdAsset] === "function"
      ) || options.fetchProvider.libGDPath, 
      `❌ You should provide fetch methods or fetch url for necessary libGD assets: ${libGdAssets.map(isRequiredLibGdAssets)}.`
    );
  }

  return options;
};

/**
 * Downloads a GDevelop version (libGD.js, the runtime and the extensions).
 * 
 * @param {{ versionTag: string, user: string, fetchProvider: GdFetchDataProvider, authToken?: string }} fetchConfiguration Fetch configuration.
 */
const downloadVersion = async function ({ versionTag, user, fetchProvider }) {
  const tasks = [];
  const gdPath = getRuntimePath(versionTag, user);

  // Make sure "Versions" directory exists
  fs.ensureDirSync(getVersionsPath());
  // Clear directory
  fs.emptyDirSync(gdPath);

  // Fetch the file with GDJS Runtime and extensions
  console.info(`🕗 Starting download of GDevelop Runtime '${versionTag}'...`);
  tasks.push(
    (async () => {
      const zipPath = path.join(gdPath, "gd.zip");
      const pathMapping = {
        "GDJS/Runtime": "Runtime",
        "Extensions": "Runtime/Extensions",
      };
      await downloadFile(`https://codeload.github.com/${user}/GDevelop/legacy.zip/${versionTag}`, zipPath);
      console.info(`✅ Done downloading GDevelop Runtime '${versionTag}'`);
      console.info(`🕗 Extracting GDevelop Runtime '${versionTag}'...`);
      await extractGdZip(
        zipPath,
        gdPath,
        user,
        ['GDJS/Runtime', "Extensions"],
        (pathToMap) => pathMapping[pathToMap] || pathToMap,
      );
      await fs.remove(zipPath);
      console.info(`✅ Done extracting the GDevelop Runtime`)
    })()
    .then(() => {
      if (!fs.existsSync(path.join(gdPath, "Runtime/gd.js"))) {
        console.info(`🕗 Compiling Runtime...`);
        return require("./build")(gdPath);
      }
    }
  ));

  console.info(`🕗 Starting download of GDevelop Core...`);
  for (const libGdAsset of libGdAssets) {
    const isRequired = isRequiredLibGdAssets(libGdAsset);

    if (fetchProvider[libGdAsset]) {
      console.info(`🕗 Delegate loading of '${libGdAsset}' to available provider...`);
      tasks.push(
        fetchProvider[libGdAsset](gdPath)
        .then(() => console.info(`✅ Loading of '${libGdAsset}' is finished by provider.`))
      );
    } else if (fetchProvider.libGDPath) {
      tasks.push(
        downloadFile(fetchProvider.libGDPath + libGdAsset, path.join(gdPath, libGdAsset), isRequired)
        .then((errored) => !errored && console.info(`✅ Done downloading ${libGdAsset}`))
      );
    } else if (!isRequired) {
      console.warn(`Skip loading of '${libGdAsset}' as fetching data is not provided.`)
    } else {
      throw new Error(`❌ No fetching data provided for required asset '${libGdAsset}'.`)
    }
  }

  await Promise.all(tasks);
  console.info(`✅ Successfully downloaded GDevelop version '${versionTag}'`);
};

/**
 * Initialize libGD.js.
 * If the version is not present, download it.
 * Returning `gd` doesn't work, so a hacky workaround with global is used.
 * @param {{ versionTag: string, user: string, fetchProvider: GdFetchDataProvider, authToken?: string }} fetchOptions Fetch configuration.
 */
 const getGD = async function (fetchOptions, gdOptions) {
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

module.exports = {
  getRuntimePath,
  getGD,
  findLatestVersion,
  getFetchConfiguration,
};
