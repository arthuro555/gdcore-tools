//@ts-check
import { join } from "node:path";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { __dirname, cmd, npm_i } from "./utils.mjs";
import { build } from "esbuild";
import { babelFlowPlugin } from "esbuild-plugin-babel-flow";
import minimist from "minimist";

const ARGS = minimist(process.argv, {
  string: ["gdevelop-path"],
  boolean: ["skip-build-gdcore", "skip-installs"],
});

const _GDEVELOP =
  ARGS["gdevelop-path"] || join(__dirname, "..", "..", "GDevelop");
const PATHS = {
  ROOT: join(__dirname, ".."),
  DIST: join(__dirname, "..", "dist"),
  RUNTIME: join(__dirname, "..", "dist", "Runtime"),
  GDEVELOP: _GDEVELOP,
  GDJS: join(_GDEVELOP, "GDJS"),
  GDCORE: join(_GDEVELOP, "GDevelop.js"),
  GDCORE_OUTPUT: join(_GDEVELOP, "Binaries/embuild/GDevelop.js"),
  LOADERS: join(__dirname, "loaders.mjs"),
  NEWIDE: join(_GDEVELOP, "newIDE/app"),
  FILESYSTEM_MODULE: join(
    _GDEVELOP,
    "newIDE/app/src/ExportAndShare/LocalExporters/LocalFileSystem.js"
  ),
  TMP: join(__dirname, "tmp"),
  FILESYSTEM_MODULE_PATCHED: join(__dirname, "tmp", "LocalFileSystem.js"),
};

rmSync(PATHS.DIST, { force: true, recursive: true });

if (!existsSync(PATHS.GDEVELOP)) {
  console.info(`GDevelop not found in "${PATHS.GDEVELOP}, cloning now!"`);
  cmd(
    `git clone --depth 1 https://github.com/4ian/GDevelop "${PATHS.GDEVELOP}"`,
    { cwd: join(PATHS.GDEVELOP, "..") }
  );
}

if (!ARGS["skip-installs"]) {
  console.info(`Installting dependencies...`);
  npm_i(PATHS.NEWIDE);
  npm_i(PATHS.GDJS);
}

console.info(`Building & importing GDJS...`);
cmd(`npm run build -- --out ${PATHS.RUNTIME}`, { cwd: PATHS.GDJS });

if (!ARGS["skip-build-gdcore"]) {
  console.info(`Building GDCore...`);
  if (!ARGS["skip-installs"]) npm_i(PATHS.GDCORE);
  cmd(`npm run build`, { cwd: PATHS.GDCORE });
}

console.info(`Importing GDCore...`);
cpSync(
  join(PATHS.GDCORE_OUTPUT, "libGD.wasm"),
  join(PATHS.DIST, "lib", "libGD.wasm")
);
writeFileSync(
  join(PATHS.DIST, "lib", "libGD.cjs"),
  `//@ts-nocheck
` + readFileSync(join(PATHS.GDCORE_OUTPUT, "libGD.js"), { encoding: "utf-8" })
);

console.info(`Patching & importing gd.d.ts...`);
writeFileSync(
  join(PATHS.ROOT, "gd.d.ts"),
  readFileSync(join(PATHS.GDCORE, "types.d.ts"), { encoding: "utf-8" }).replace(
    /declare global {[^}]*}/,
    ""
  )
);

console.info(`Patching & importing LocalFileSystem...`);

const fsModule = readFileSync(PATHS.FILESYSTEM_MODULE, { encoding: "utf-8" });

if (
  !fsModule.includes(
    `import { isURL } from '../../ResourcesList/ResourceUtils';`
  )
) {
  console.error("CHANGES NEEDED: isURL not found!");
  process.exit(1);
}

if (!fsModule.includes(`import { getUID } from '../../Utils/LocalUserInfo';`)) {
  console.error("CHANGES NEEDED: getUID not found!");
  process.exit(1);
}

if (
  !fsModule.includes(
    `import optionalRequire from '../../Utils/OptionalRequire';`
  )
) {
  console.error("CHANGES NEEDED: optionalRequire not found!");
  process.exit(1);
}

mkdirSync(PATHS.TMP, { recursive: true });
writeFileSync(
  PATHS.FILESYSTEM_MODULE_PATCHED,
  readFileSync(PATHS.FILESYSTEM_MODULE, { encoding: "utf-8" })
    .replace(
      `import { isURL } from '../../ResourcesList/ResourceUtils';`,
      `const isURL = (filename: string) => {
  return (
    filename.startsWith('http://') ||
    filename.startsWith('https://') ||
    filename.startsWith('ftp://') ||
    filename.startsWith('blob:') ||
    filename.startsWith('data:')
  );
};`
    )
    .replace(
      `import { getUID } from '../../Utils/LocalUserInfo';`,
      `const getUID = () => "gdcore-tools";`
    )
    .replace(`import optionalRequire from '../../Utils/OptionalRequire';`, ``)
    .replaceAll("optionalRequire", `require`)
);

console.info("Building & minifying all imported code...");
await build({
  entryPoints: [PATHS.LOADERS],
  minify: true,
  treeShaking: true,
  bundle: true,
  outfile: join(PATHS.DIST, "loaders.cjs"),
  format: "cjs",
  plugins: [babelFlowPlugin()],
  platform: "node",
  banner: { js: "//@ts-nocheck" },
  drop: ["console"],
  packages: "bundle",
});

console.log("✅ Done!");
