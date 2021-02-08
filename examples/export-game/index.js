// Note: for exporting games programatically, look into GDExporter.
// https://github.com/arthuro555/gdexporter

const loadGD = require("../..");

let gdTools;
loadGD()
  .then((_gdTools) => {
    gdTools = _gdTools;
    // Load the project file
    return gdTools.loadProject("./game.json");
  })
  .then((project) => gdTools.exportProject(project, "GameExport"));
