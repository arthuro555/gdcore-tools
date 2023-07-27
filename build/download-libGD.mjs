//@ts-check
import { request } from "@octokit/request";
import { join } from "node:path";
import { createWriteStream, mkdirSync } from "node:fs";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";
import { __dirname } from "./utils.mjs";

const PATHS = {
  OUTPUT: join(__dirname, "..", "dist", "lib"),
};

/**
 * @param {string} commit_sha
 * @param {string} file
 */
async function downloadFile(commit_sha, file) {
  const url = `https://s3.amazonaws.com/gdevelop-gdevelop.js/master/commit/${commit_sha}/${file.replace(
    "cjs",
    "js"
  )}`;
  const destination = join(PATHS.OUTPUT, file);

  const { body, ok } = await fetch(url);

  if (!ok) throw new Error(`Request unsuccessful`);
  if (!body) throw new Error("No response body???");

  const writeStream = createWriteStream(destination);
  //@ts-ignore Node types are a dummy
  await finished(Readable.fromWeb(body).pipe(writeStream));
}

/** @param {string} versionTag  */
async function findLatestCommitWithCIBuilds(versionTag) {
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

  return commit.sha;
}

/**
 * Downloads a GDevelop version's GDevelop.js (GDCore transpiled to JS).
 * @param {string} versionTag The GDevelop version tag
 */
export const downloadLibGD = async function (versionTag) {
  const commit_sha = await findLatestCommitWithCIBuilds(versionTag);
  mkdirSync(PATHS.OUTPUT, { recursive: true });

  // Download the fitting libGD version
  const tasks = [
    downloadFile(commit_sha, "libGD.cjs").then(() =>
      console.info(`✅ Done downloading libGD.js`)
    ),
    downloadFile(commit_sha, "libGD.js.mem")
      .then(() => console.info(`✅ Done downloading libGD.js.mem`))
      .catch(() => {}),
    downloadFile(commit_sha, "libGD.wasm")
      .then(() => console.info(`✅ Done downloading libGD.wasm`))
      .catch(() => {}),
  ];

  return Promise.all(tasks).then(() =>
    console.info(
      `✅ Successfully downloaded GDevelop Core for version '${versionTag}'`
    )
  );
};
