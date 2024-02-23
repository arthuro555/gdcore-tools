//@ts-nocheck
export { default as makeExtensionsLoader } from "../../GDevelop/newIDE/app/src/JsExtensionsLoader/LocalJsExtensionsLoader";
export {
  loadProjectEventsFunctionsExtensions,
  reloadProjectEventsFunctionsExtensionMetadata,
} from "../../GDevelop/newIDE/app/src/EventsFunctionsExtensionsLoader";
export { makeLocalEventsFunctionCodeWriter } from "../../GDevelop/newIDE/app/src/EventsFunctionsExtensionsLoader/CodeWriters/LocalEventsFunctionCodeWriter.js";
export {
  split,
  unsplit,
  getSlugifiedUniqueNameFromProperty,
} from "../../GDevelop/newIDE/app/src/Utils/ObjectSplitter";
export { default as assignIn } from "lodash/assignIn";
export { default as LocalFileSystem } from "./tmp/LocalFileSystem";
