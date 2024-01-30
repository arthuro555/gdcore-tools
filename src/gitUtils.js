const { request } = require("@octokit/request");
const fs = require("fs-extra-promise");

/**
 * Returns octokit request authorization object if the token is provided.
 * @param {string} [authToken] Github private token for authorization.
 * @returns {{ authorization: string } | { }} Octokit request authorization object.
 */
const getAuthHeader = (authToken) => authToken ? { authorization: authToken } : {};

/**
 * Returns map object of release asset names as keys and asset ids as values.
 * @param {string} user Github user of release.
 * @param {string} versionTag Release tag to get assets of.
 * @param {string} [authToken] Github private token for authorization. 
 * @returns {Promise<{ [assetName: string]: string }>} Map object of asset names to ids.
 */
const getAssetsIdsMap = async (user, versionTag, authToken) => {
  const {
    data: { assets }
  } = await request('GET /repos/{user}/GDevelop/releases/tags/{tag}', {
    user,
    tag: versionTag,
    headers: getAuthHeader(authToken),
  });

  return assets.reduce((data, { id, name }) => (data[name] = id) && data, {});
};

/**
 * Downloads GitHub release asset.
 * @param {string} filePath Path to save asset by.
 * @param {string} user Github user of release asset.
 * @param {string} id Specific release asset id.
 * @param {string} [authToken] Github private token for authorization. 
 * @returns {Promise<void>}
 */
const downloadGitBinaryAsset = (filePath, user, id, authToken) =>
  request('GET /repos/{user}/GDevelop/releases/assets/{id}', {
    user,
    id,
    headers: {
      ...getAuthHeader(authToken),
      accept: 'application/octet-stream',
    },
  })
    .then(({ data }) => fs.writeFile(filePath, Buffer.from(data)));

/**
 * Returns the latest commit for which libGD.js was built for the official GDevelop repo.
 * @param {string} versionTag Release tag to get assets of.
 * @param {string} [authToken] Github private token for authorization. 
 * @returns {Object} Octokit commit object.
 */
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
 * Returns the latest GDevelop repo release for the specified user.
 * @param {string} user Github user of release.
 * @param {string} [authToken] Github private token for authorization. 
 * @returns {Promise<string>} Latest GDevelop repo release for specified user
 */
const findLatestRelease = (user, authToken) =>
  request(`GET /repos/${user}/GDevelop/releases/latest`, {
    headers: getAuthHeader(authToken)
  })
  .then(({ data }) => {
    resolve(data.tag_name);
  })

module.exports = {
  getAssetsIdsMap,
  getAuthHeader,
  downloadGitBinaryAsset,
  getLatestCiCommit,
  findLatestRelease,
};