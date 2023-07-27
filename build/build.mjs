//@ts-check
import { request } from "@octokit/request";
import { join } from "node:path";
import { downloadLibGD } from "./download-libGD.mjs";
import { rmSync } from "node:fs";
import { __dirname, cmd } from "./utils.mjs";
import { build } from "esbuild";
import { babelFlowPlugin } from "esbuild-plugin-babel-flow";

const PATHS = {
  ROOT: join(__dirname, ".."),
  DIST: join(__dirname, "..", "dist"),
  RUNTIME: join(__dirname, "..", "dist", "Runtime"),
  GDEVELOP: join(__dirname, "..", "GDevelop"),
  GDJS: join(__dirname, "..", "GDevelop", "GDJS"),
  LOADERS: join(__dirname, "loaders.mjs"),
};

rmSync(PATHS.DIST, { force: true, recursive: true });

const findLatestVersion = async () => {
  const {
    data: { tag_name },
  } = await request("GET /repos/4ian/GDevelop/releases/latest");
  return tag_name;
};

const versionTag = await findLatestVersion();

await downloadLibGD(versionTag);

cmd("git submodule update --init --remote", { cwd: PATHS.ROOT });
cmd(`git checkout ${versionTag}`, { cwd: PATHS.GDEVELOP });
cmd(`npm run build -- --out ${PATHS.RUNTIME}`, { cwd: PATHS.GDJS });

await build({
  entryPoints: [PATHS.LOADERS],
  //minify: true,
  bundle: true,
  outfile: join(PATHS.DIST, "loaders.cjs"),
  format: "cjs",
  plugins: [babelFlowPlugin()],
  platform: "node",
});

console.log("✅ Done!");
