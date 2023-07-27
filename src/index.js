import { join } from "node:path";
import initializeGDevelopJs from "../dist/lib/libGD.cjs";
import { __dirname } from "./utils.mjs";
import { createProjectLoader } from "./open_project.js";

// Temporarily remove fetch as otherwise Emscripten wrongfully assumes this is a browser
const fetch = globalThis.fetch;
delete globalThis.fetch;
export const gd = await new Promise((resolve) => {
  initializeGDevelopJs().then((gd) => {
    delete gd.then;
    resolve(gd);
  });
});
globalThis.fetch = fetch;

gd.ProjectHelper.initializePlatforms();

// Some GDevelop modules (from which loaders.cjs is bundled) depend on gd being globally available.
// Temporarily make it global to allow these to grab the reference to gd they need.
global.gd = gd;
const loaders = await import("../dist/loaders.cjs");
delete global.gd;

{
  const extensionsLoader = loaders.makeExtensionsLoader({
    gd,
    onFindGDJS: async () => ({
      gdjsRoot: join(__dirname, "..", "dist"),
    }),
  });

  await extensionsLoader.loadAllExtensions((str) => str);
}

/** @param {string} path */
export const loadProject = createProjectLoader({ gd, ...loaders });
