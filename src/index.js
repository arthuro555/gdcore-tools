import initializeGDevelopJs from "../dist/lib/libGD.cjs";

const fetch = globalThis.fetch;
delete globalThis.fetch;

export const gd = await new Promise((resolve) =>
  initializeGDevelopJs().then(() => {
    delete gd.then;
    console.log("yes")
    resolve(gd);
  })
);

globalThis.fetch = fetch
console.log("no")

gd.ProjectHelper.initializePlatforms();

global.gd = gd;
const loaders = await import("../dist/loaders");
delete global.gd;

loaders.loadAllExtensions();
