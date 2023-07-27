const fs = require("fs-extra-promise");
const path = require("path");
const { request } = require("@octokit/request");
const { https } = require("follow-redirects");

const getRuntimePath = (version) => path.join(__dirname, "Versions", version);

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

const findLatestVersion = () => {
  return new Promise((resolve, reject) => {
    // Fetch base release infos
    console.info(`🕗 Getting latest release tag...`);
    return request("GET /repos/4ian/GDevelop/releases/latest")
      .then(({ data }) => {
        resolve(data.tag_name);
      })
      .catch(() => {
        console.error(
          "❌ Couldn't fetch latest version, using latest local version."
        );
        fs.readdirAsync(path.join(__dirname, "Versions"))
          .then((versions) => resolve(versions[0]))
          .catch(() => {
            console.error(
              "💀 Fatal Error! Couldn't find or download the latest version."
            );
            reject();
          });
      });
  });
};

/**
 * Downloads a GDevelop version (libGD.js, the runtime and the extensions).
 * @param {string} versionTag The GDevelop version tag
 */
const downloadVersion = async function (versionTag) {
  const tasks = [];
  const gdPath = getRuntimePath(versionTag);

  // Make sure "Versions" directory exists
  const versionsDir = path.join(__dirname, "Versions");
  await fs.accessAsync(versionsDir).catch(() => fs.mkdirAsync(versionsDir));

  // Clear directory
  await fs
    .accessAsync(gdPath)
    .catch(() => null) // Swallow the error as it is expected to error
    .then(() => fs.removeAsync(gdPath))
    .finally(() => fs.mkdirAsync(gdPath));

  let commit = (
    await request("GET /repos/4ian/GDevelop/commits/{ref}", {
      ref: (
        await request("GET /repos/4ian/GDevelop/git/ref/tags/{tag}", {
          tag: versionTag,
        })
      ).data.object.sha,
    })
  ).data;

  // Go up to the latest commit for which libGD.js was built
  while (commit.commit.message.indexOf("[skip ci]") !== -1) {
    commit = (
      await request("GET /repos/4ian/GDevelop/commits/{ref}", {
        ref: commit.parents[0].sha,
      })
    ).data;
  }

  // Download the fitting libGD version
  const libGDPath =
    "https://s3.amazonaws.com/gdevelop-gdevelop.js/master/commit/" +
    commit.sha +
    "/";
  console.info(`🕗 Starting download of GDevelop Core...`);
  tasks.push(
    downloadFile(libGDPath + "libGD.js", path.join(gdPath, "libGD.js")).then(
      () => console.info(`✅ Done downloading libGD.js`)
    )
  );
  tasks.push(
    downloadFile(
      libGDPath + "libGD.js.mem",
      path.join(gdPath, "libGD.js.mem"),
      false
    ).then(
      (errored) => !errored && console.info(`✅ Done downloading libGD.js.mem`)
    )
  );
  tasks.push(
    downloadFile(
      libGDPath + "libGD.wasm",
      path.join(gdPath, "libGD.wasm"),
      false
    ).then(
      (errored) => !errored && console.info(`✅ Done downloading libGD.wasm`)
    )
  );

  return Promise.all(tasks).then(() =>
    console.info(`✅ Successfully downloaded GDevelop version '${versionTag}'`)
  );
};

/**
 * Initialize libGD.js.
 * If the version is not present, download it.
 * Returning `gd` doesn't work, so a hacky workaround with global is used.
 * @param {string} [versionTag] The GDevelop version to use. If not precised, the latest is used.
 */
const getGD = async function (versionTag, gdOptions) {
  const runtimePath = getRuntimePath(versionTag);
  // Download the version if it isn't present
  try {
    fs.accessSync(runtimePath);
  } catch {
    console.log("❌ The GDevelop version was not found, downloading it!");
    await downloadVersion(versionTag).catch(console.error);
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
};
