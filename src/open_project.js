//@ts-check
import { readFile } from "fs/promises";
import { dirname, join } from "path";

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

export const createProjectLoader = (
  /** @type {{gd: {ProjectHelper:{createNewGDJSProject:() => ({unserializeFrom: (serializedProject:any) => void})}},unsplit: (object: any, opts: {getReferencePartialObject: ((path: string) => Promise<string>), isReferenceMagicPropertyName: string, maxUnsplitDepth: number}) => any, unserializeFromJSObject: (object: any) => any, loadProjectEventsFunctionsExtensions: ((project:any, writer:any, i18n:any) => Promise<void>), makeLocalEventsFunctionCodeWriter: ((opts:{onWriteFile:() => void}) => any)}} */ {
    gd,
    unsplit,
    unserializeFromJSObject,
    loadProjectEventsFunctionsExtensions,
    makeLocalEventsFunctionCodeWriter,
  }
) =>
  async function loadProject(/** @type {string} */ projectFilePath) {
    const projectPath = dirname(projectFilePath);

    const object = await readJSONFile(projectFilePath);
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

    const gdSerializer = gd.Serializer.fromJSObject(object);
    const project = gd.ProjectHelper.createNewGDJSProject();
    project.unserializeFrom(gdSerializer);
    gdSerializer.delete();

    loadProjectEventsFunctionsExtensions(
      project,
      makeLocalEventsFunctionCodeWriter({ onWriteFile: () => 0 }),
      (str) => str
    );

    return project;
  };
