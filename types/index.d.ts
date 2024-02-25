/**
 * @param {gd.Project} project
 * @param {string} outputDirectory
 * @param {"electron" | "cordova" | "facebookInstantGames"} [exportTarget]
 */
export function exportProject(project: gd.Project, outputDirectory: string, exportTarget?: "electron" | "cordova" | "facebookInstantGames" | undefined): void;
export let gd_internal_logs: string;
/** @type {typeof import("../gd.js")} */
export const gd: typeof import("../gd.js");
export const runtimePath: string;
/** @type {gd.AbstractFileSystemJS} */
export const localFileSystem: gd.AbstractFileSystemJS;
/**
 * @param {string} path
 * @returns {Promise<gd.Project>}
 */
export const loadProject: (projectFilePath: string) => Promise<import("../gd.js").Project>;
/**
 * @param {gd.Project} project
 * @param {string} [pathToProjectFile]
 * @returns {Promise<void>}
 */
export const saveProject: (project: import("../gd.js").Project, pathToProjectFile?: string | undefined) => Promise<void>;
