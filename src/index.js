import { join } from "node:path";
import initializeGDevelopJs from "../dist/lib/libGD.cjs";
import { __dirname } from "./utils.mjs";
import { createProjectLoader, createProjectSaver } from "./open_project.js";

export let gd_internal_logs = "";

// Temporarily remove fetch as otherwise Emscripten wrongfully assumes this is a browser
const fetch = globalThis.fetch;
//@ts-ignore We are doing a Hack™
delete globalThis.fetch;
/** @type {typeof GD} */
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

/** @type {GD.AbstractFileSystemJS} */
export const localFileSystem = loaders.assignIn(
  new gd.AbstractFileSystemJS(),
  new loaders.LocalFileSystem()
);

/**
 * @param {string} path
 * @returns {Promise<GD.Project>}
 */
export const loadProject = createProjectLoader({ gd, ...loaders });

/**
 * @param {GD.Project} project
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
 * @param {GD.Project} project
 * @param {string} [pathToProjectFile]
 * @returns {Promise<void>}
 */
export const saveProject = createProjectSaver({ gd, ...loaders });
