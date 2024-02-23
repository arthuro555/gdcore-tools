// Note: for exporting games programatically, look into GDExporter.
// https://github.com/arthuro555/gdexporter

import {
  loadProject,
  exportProject,
  gd_internal_logs,
} from "gdcore-tools";

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = dirname(fileURLToPath(import.meta.url));

const project = await loadProject(__dirname + "/game.json");
console.log(project.getName());
exportProject(project, "GameExport");
console.log(gd_internal_logs);
