// Note: for exporting games programatically, look into GDExporter.
// https://github.com/arthuro555/gdexporter

import { loadProject,  } from "../../src/index.js";

const project = await loadProject("./game.json");
console.log(project.getName());
//await exportProject(project, "GameExport");
