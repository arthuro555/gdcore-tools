//@ts-check
import { readFile, rm, writeFile, rename } from "node:fs/promises";
import { dirname, basename, join } from "node:path";

/** @param {string} filepath */
const readJSONFile = async (filepath) => {
  const data = await readFile(filepath, { encoding: "utf8" });
  try {
    const dataObject = JSON.parse(data);
    return dataObject;
  } catch (ex) {
    throw new Error(filepath + " is a corrupted/malformed file.");
  }
};

/** @returns {(projectFilePath: string) => Promise<gd.Project>} */
export const createProjectLoader = (
  /** @type {{gd: typeof import("../gd.js"), unsplit: (object: any, opts: {getReferencePartialObject: ((path: string) => Promise<string>), isReferenceMagicPropertyName: string, maxUnsplitDepth: number}) => any, loadProjectEventsFunctionsExtensions: ((project:gd.Project, writer:any, i18n:any) => Promise<void>), makeLocalEventsFunctionCodeWriter: ((opts:{onWriteFile:() => void}) => any)}} */ {
    gd,
    unsplit,
    loadProjectEventsFunctionsExtensions,
    makeLocalEventsFunctionCodeWriter,
  }
) =>
  async function loadProject(/** @type {string} */ projectFilePath) {
    const projectPath = dirname(projectFilePath);

    // This is a very small part of the code that cannot be extracted from GDevelop directly due
    // to being tightly coupled with React. Luckily, it should rarely if ever change, but it is
    // something to watch out for as a potential point of failure.
    // --- FROM HERE ---
    const object = await readJSONFile(projectFilePath);
    object.properties.projectFile = projectFilePath;
    await unsplit(object, {
      getReferencePartialObject: (referencePath) => {
        return readJSONFile(join(projectPath, referencePath) + ".json");
      },
      isReferenceMagicPropertyName: "__REFERENCE_TO_SPLIT_OBJECT",
      // Limit unsplitting to depth 3 (which would allow properties of layouts/external layouts/external events
      // to be un-splitted, but not the content of these properties), to avoid very slow processing
      // of large game files.
      maxUnsplitDepth: 3,
    });

    //@ts-ignore The typings do not include this function yet, but it is present.
    const gdSerializer = gd.Serializer.fromJSObject(object);
    const project = gd.ProjectHelper.createNewGDJSProject();
    project.unserializeFrom(gdSerializer);
    gdSerializer.delete();
    // --- TO HERE ---

    project.setProjectFile(projectFilePath);

    await loadProjectEventsFunctionsExtensions(
      project,
      makeLocalEventsFunctionCodeWriter({ onWriteFile: () => null }),
      (/** @type {string} */ str) => str
    );

    return project;
  };

// This is a very small part of the code that cannot be extracted from GDevelop directly due
// to being tightly coupled with React. Luckily, it should rarely if ever change, but it is
// something to watch out for as a potential point of failure.
// --- FROM HERE ---
const splittedProjectFolderNames = [
  "layouts",
  "externalLayouts",
  "externalEvents",
  "eventsFunctionsExtensions",
];
const splitPathsSet = new Set(
  splittedProjectFolderNames.map((folderName) => `/${folderName}/*`)
);
const splitPaths = (/** @type {string} */ path) => splitPathsSet.has(path);
// --- TO HERE ---

const writeAndCheckFile = async (
  /** @type {any} */ content,
  /** @type {string} */ path
) => {
  const projectPath = dirname(path);
  const fileName = basename(path);
  const tmp = `${projectPath}/.${fileName}`;
  const str = JSON.stringify(content, null, 2);

  // Write with temp name to not override previous save yet.
  await writeFile(tmp, str);

  // Check writing succeeded before overriding previous save.
  try {
    JSON.parse(await readFile(tmp, "utf-8"));
  } catch {
    await rm(tmp);
    throw new Error(`Could not save file "${path}"!`);
  }

  // Remove previous save and replace with the new one.
  await rm(path);
  await rename(tmp, path);
};

/** @returns {(project: gd.Project, pathToProjectFile?: string) => Promise<void>} */
export const createProjectSaver = (
  /** @type {{gd: typeof import("../gd.js"), split: (object: any, opts: {pathSeparator: string, getArrayItemReferenceName: (object: Object, currentReference: string) => string, shouldSplit: (path: string) => boolean, isReferenceMagicPropertyName: string}) => {reference: string, object: {}}[], getSlugifiedUniqueNameFromProperty: (propertyName: string) => (object: Object, currentReference: string) => string}} */ {
    gd,
    split,
    getSlugifiedUniqueNameFromProperty,
  }
) =>
  async function saveProject(
    /** @type {gd.Project} */ project,
    /** @type {string} */ pathToProjectFile = project.getProjectFile()
  ) {
    const projectDirectoryPath = dirname(pathToProjectFile);

    // This is a very small part of the code that cannot be extracted from GDevelop directly due
    // to being tightly coupled with React. Luckily, it should rarely if ever change, but it is
    // something to watch out for as a potential point of failure.
    // --- FROM HERE ---
    const serializedElement = new gd.SerializerElement();
    project.serializeTo(serializedElement);
    const serializedProjectObject = JSON.parse(
      gd.Serializer.toJSON(serializedElement)
    );
    serializedElement.delete();

    if (project.isFolderProject()) {
      const partialObjects = split(serializedProjectObject, {
        pathSeparator: "/",
        getArrayItemReferenceName: getSlugifiedUniqueNameFromProperty("name"),
        shouldSplit: splitPaths,
        isReferenceMagicPropertyName: "__REFERENCE_TO_SPLIT_OBJECT",
      });

      await Promise.all(
        partialObjects.map(({ object, reference }) => {
          return writeAndCheckFile(
            object,
            join(projectDirectoryPath, reference) + ".json"
          );
        })
      );
    }

    await writeAndCheckFile(serializedProjectObject, pathToProjectFile);
    // --- TO HERE ---
  };
