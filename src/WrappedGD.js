const EventEmitter = require("events");
const loadExtensions = require("./JsExtensionsLoader/LocalJsExtensionsLoader");
const projectLoader = require("./LocalProjectOpener");
const { makeLoader } = require("./EventsFunctionsExtensionsLoader/index");
const {
  makeLocalEventsFunctionCodeWriter,
} = require("./EventsFunctionsExtensionsLoader/LocalEventsFunctionCodeWriter");
const saveProject = require("./LocalProjectWriter");
const assignIn = require("lodash/assignIn");
const { getGD, getRuntimePath } = require("./downloadGD");
const { join, resolve } = require("path");
const { makeFS } = require("./LocalFileSystem");

class WrappedGD extends EventEmitter {
  constructor(version) {
    super();

    /**
     * The raw gd namespace.
     */
    this.gd = null;

    /**
     * The GDevelop abstract file system.
     * @private
     */
    this.fs = null;

    /**
     * The Events Functions loader
     * @private
     */
    this.eventsFunctionsLoader = null;

    /**
     * The Events Functions loader.
     * @private
     */
    this.eventsFunctionsWriter = makeLocalEventsFunctionCodeWriter();

    /**
     * The path to the current version.
     * @private
     */
    this.versionPath = getRuntimePath(version);

    // Begin async loading of GDCore and extensions
    getGD(version, {
      print: (message) => this.emit("print", message),
      printErr: (e) => this.emit("error", e),
      onAbort: (e) => this.emit("error", e),
    })
      .then((gd) => {
        this.gd = gd;
        return loadExtensions(
          gd,
          join(this.versionPath, "Runtime", "Extensions")
        );
      })
      .then(() => {
        this.fs = assignIn(new this.gd.AbstractFileSystemJS(), makeFS(this.gd));
        this.eventsFunctionsLoader = makeLoader(
          this.gd
        ).loadProjectEventsFunctionsExtensions;
      })
      .then(() => this.emit("ready"))
      .catch((e) => this.emit("initError", e));
  }

  /**
   * Loads a project json file.
   * @param {string} projectLocation The path to the json file
   */
  loadProject(projectLocation) {
    return projectLoader
      .loadProjectFiles(projectLocation)
      .then((projectFile) => {
        projectFile.content.properties.projectFile = projectLocation;
        return projectLoader.loadSerializedProject(
          this.gd,
          projectFile.content
        );
      })
      .then(async (project) => {
        await this.reloadEventsFunctions(project);
        project.setProjectFile(resolve(projectLocation));
        return project;
      });
  }

  /**
   * Saves a project to a json file.
   * @param {*} project The loaded project
   * @param {string} [fileName] The name of the file to save. Defaults to "game.json".
   * @param {string} [pathName] The path to save to. Defaults to "./".
   */
  saveProject(project, fileName, pathName) {
    pathName = pathName || "./";
    fileName = join(pathName, fileName || "game.json");
    return saveProject(this.gd, project, fileName, pathName);
  }

  /**
   * Exports a project.
   * @param {*} project The loaded project.
   * @param {string} outputDir The output directory.
   * @param {Object<string>} [options] Options to pass to the exporter.
   */
  exportProject(project, outputDir, options) {
    const gd = this.gd;
    const exporter = new gd.Exporter(this.fs, this.versionPath);

    if (typeof gd.ExportOptions === "function") {
      const exportOptions = new gd.ExportOptions(project, outputDir);
      const exportTarget = !options
        ? null
        : options.exportForElectron
        ? "electron"
        : options.exportForCordova
        ? "cordova"
        : options.exportForFacebookInstantGames
        ? "facebookInstantGames"
        : null;
      if (exportTarget) exportOptions.setTarget(exportTarget);
      exporter.exportWholePixiProject(exportOptions);
      exportOptions.delete();
    } else {
      // In older versions, exportOptions was another more generic class.
      const exportOptions = new gd.MapStringBoolean();
      if (options) {
        for (let key in options) {
          exportOptions.set(key, options[key]);
        }
      }
      exporter.exportWholePixiProject(project, outputDir, exportOptions);
      exportOptions.delete();
    }

    exporter.delete();
  }

  /**
   * Reload and generate events based extensions in a project.
   * @param {*} project
   */
  reloadEventsFunctions(project) {
    return this.eventsFunctionsLoader(project, this.eventsFunctionsWriter);
  }

  /**
   * Returns the path to the runtime files.
   * @returns {string}
   */
  getRuntimePath() {
    return join(this.versionPath, "Runtime");
  }
}

module.exports = WrappedGD;
