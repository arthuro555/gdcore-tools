const { findLatestVersion } = require("./downloadGD");
const WrappedGD = require("./WrappedGD");

const loadGD = async (version) => {
  if (version === undefined) version = await findLatestVersion();
  return new Promise((resolve, reject) => {
    const wgd = new WrappedGD(version);
    wgd.once("ready", () => {
      wgd.removeAllListeners();
      resolve(wgd);
    });
    wgd.once("initError", reject);
  });
};

module.exports = loadGD;
