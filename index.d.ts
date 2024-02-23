import type * as _GD from "./gd.d.ts";

declare global {
  export type float = number;
}

/**
 * The full GDevelop Core namespace.
 *
 * It is documented in details at the following links:
 * https://docs.gdevelop.io/GDCore%20Documentation/
 * https://docs.gdevelop.io/GDJS%20Documentation/index.html
 *
 * Some methods are missing, have been added, or have different
 * signatures because of Emscripten bindings differring from
 * the GDCore API - rely on the bundled TypeScript typings
 * to see what methods are available to you.
 */
export const gd: typeof _GD;

/**
 * Loads in a gd::Project from a json file on the filesystem.
 * @param {string} projectFilePath The path on the filesystem to the project file.
 */
export const loadProject: (projectFilePath: string) => Promise<GD.Project>;

/**
 * Saves an in-memory gd::Project back to a JSON file on the system.
 * @param {GD.Project} project The project to save.
 * @param {string} [projectFilePath] The path to the project, defaults to the path the project was opened from.
 */
export const saveProject: (
  project: GD.Project,
  projectFilePath?: string
) => Promise<void>;

/**
 * Exports an in-memory gd::Project to a folder on the filesystem.
 */
export const exportProject: (
  project: GD.Project,
  outputDirectory: string,
  exportTarget?: "electron" | "cordova" | "facebookInstantGames"
) => void;

/**
 * The path to the GDJS Runtime files.
 *
 * If they are modified, the output of exports will be modified
 * until the package is reinstalled.
 */
export const runtimePath: string;

/**
 * The internal logs emitted by libGD, which are mostly noise
 * and thus redirected & stored within this string instead of
 * being logged to the console.
 */
export const gd_internal_logs: string;

/**
 * An implementation of gd::AbstractFileSystem for the local filesystem.
 */
export const localFileSystem: GD.AbstractFileSystemJS;
