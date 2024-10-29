import { join } from "node:path";
//@ts-ignore It's this file's job to apply the types, the imported file cannot yet be typed.
import initializeGDevelopJs from "../dist/lib/libGD.cjs";
import { __dirname } from "./utils.mjs";
import { createProjectLoader, createProjectSaver } from "./open_project.mjs";

export let gd_internal_logs = "";

// Temporarily remove fetch as otherwise Emscripten wrongfully assumes this is a browser
const fetch = globalThis.fetch;
//@ts-ignore We are doing a Hack™
delete globalThis.fetch;
/** @type {typeof import("../gd.js")} */
export const gd = await new Promise((resolve) => {
  initializeGDevelopJs({
    print: (/** @type {string} */ message) => {
      gd_internal_logs += message + "\n";
    },
    printErr: (/** @type {string} */ message) => {
      gd_internal_logs += message + "\n";
    },
  }).then((/** @type {any} */ gd) => {
    delete gd.then;
    resolve(gd);
  });
});
globalThis.fetch = fetch;

gd.ProjectHelper.initializePlatforms();

// Some GDevelop modules (from which loaders.cjs is bundled) depend on gd being globally available.
// Temporarily make it global to allow these to grab the reference to gd they need.
//@ts-ignore We are doing a Hack™
global.gd = gd;
//@ts-ignore Loaders are flow-typed, no ts type definitions available.
const loaders = await import("../dist/loaders.cjs");
//@ts-ignore We are doing a Hack™
delete global.gd;

{
  const extensionsLoader = loaders.makeExtensionsLoader({
    gd,
    onFindGDJS: async () => ({
      gdjsRoot: join(__dirname, "..", "dist"),
    }),
  });

  await extensionsLoader.loadAllExtensions((/** @type {string} */ str) => str);
}

const distPath = join(__dirname, "..", "dist");
export const runtimePath = join(distPath, "Runtime");

/** @type {gd.AbstractFileSystemJS} */
export const localFileSystem = loaders.assignIn(
  new gd.AbstractFileSystemJS(),
  new loaders.LocalFileSystem()
);

/**
 * @param {string} path
 * @returns {Promise<gd.Project>}
 */
export const loadProject = createProjectLoader({ gd, ...loaders });

/**
 * @param {gd.Project} project
 * @param {string} outputDirectory
 * @param {"electron" | "cordova" | "facebookInstantGames"} [exportTarget]
 */
export function exportProject(project, outputDirectory, exportTarget) {
  const exporter = new gd.Exporter(localFileSystem, distPath);
  const exportOptions = new gd.ExportOptions(project, outputDirectory);
  if (exportTarget) exportOptions.setTarget(exportTarget);
  exporter.exportWholePixiProject(exportOptions);

  exportOptions.delete();
  exporter.delete();
}

/**
 * @param {gd.Project} project
 * @param {string} [pathToProjectFile]
 * @returns {Promise<void>}
 */
export const saveProject = createProjectSaver({ gd, ...loaders });
