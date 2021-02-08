const { serializeToJSObject } = require("./Serializer");
const {
  split,
  splitPaths,
  getSlugifiedUniqueNameFromProperty,
} = require("./ObjectSplitter");
const fs = require("fs-extra-promise");
const path = require("path");

const checkFileContent = (filePath, expectedContent) => {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, { encoding: "utf8" }, (err, content) => {
      if (err) return reject(err);

      if (content === "") {
        reject(new Error(`Written file is empty, did the write fail?`));
      }
      if (content !== expectedContent) {
        reject(
          new Error(
            `Written file is not containing the expected content, did the write fail?`
          )
        );
      }
      resolve();
    });
  });
};

const writeJSONFile = (object, filePath) => {
  try {
    const content = JSON.stringify(object, null, 2);
    if (content === "") {
      return Promise.reject(
        new Error("The content to save on disk is empty. Aborting.")
      );
    }

    return fs
      .ensureDirAsync(path.dirname(filePath))
      .then(() => fs.writeFileAsync(filePath, content))
      .then(() => checkFileContent(filePath, content));
  } catch (stringifyException) {
    return Promise.reject(stringifyException);
  }
};

/**
 * Serializes and writes a json file for project
 * @param {*} gd
 * @param {*} project
 * @param {string} filePath
 * @param {string} projectPath
 */
module.exports = (gd, project, filePath, projectPath) => {
  const serializedProjectObject = serializeToJSObject(gd, project);

  if (project.isFolderProject()) {
    const partialObjects = split(serializedProjectObject, {
      pathSeparator: "/",
      getArrayItemReferenceName: getSlugifiedUniqueNameFromProperty("name"),
      shouldSplit: splitPaths(
        new Set([
          "/layouts/*",
          "/externalLayouts/*",
          "/externalEvents/*",
          "/layouts/*",
          "/eventsFunctionsExtensions/*",
        ])
      ),
      isReferenceMagicPropertyName: "__REFERENCE_TO_SPLIT_OBJECT",
    });

    return Promise.all(
      partialObjects.map((partialObject) => {
        return writeJSONFile(
          partialObject.object,
          path.join(projectPath, partialObject.reference) + ".json"
        ).catch((err) => {
          console.error("Unable to write a partial file:", err);
          throw err;
        });
      })
    ).then(() => {
      return writeJSONFile(serializedProjectObject, filePath).catch((err) => {
        console.error("Unable to write the split project:", err);
        throw err;
      });
    });
  } else {
    return writeJSONFile(serializedProjectObject, filePath).catch((err) => {
      console.error("Unable to write the project:", err);
      throw err;
    });
  }
};
