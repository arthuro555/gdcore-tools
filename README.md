# gdcore-tools

A package that downloads and bootstraps any version of GDevelops Core library.

## Installation

`npm install gdcore-tools`

## Usage

Require the module, call it and add a callback with `.then`.
This will download the latest version of GDevelop, extract the required files,
and load GDCore wrapped with helpful functions.

```js
const loadGD = require("gdcore-tools");
loadGD().then((gdtools) => {
  // Create something awesome!
});
```

## Examples

You can find examples [here](https://github.com/arthuro555/gdcore-tools/tree/master/examples).

## API

You can find the API for GDCore (`WrappedGD.gd`) at [the official GDevelop website](https://docs.gdevelop-app.com/GDCore%20Documentation/namespacegd.html). Note that every method in `PascalCase` on the docs have to be used in `camelCase` in JavaScript.

#### Events:
##### `print`:
Triggered when GDCore wants to print a message.

##### `error`:
Triggered when GDCore errors.

##### `loadGD(version?: string | {`
##### &nbsp;&nbsp; `versionTag?: string,`
##### &nbsp;&nbsp; `user?: string,`
##### &nbsp;&nbsp; `authToken?: string,`
##### &nbsp;&nbsp; `fetchProvider?: {`
##### &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `libGDPath: string`
##### &nbsp;&nbsp;&nbsp;&nbsp; `} | {`
##### &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `useReleaseAssets: true } |`
##### &nbsp;&nbsp;&nbsp;&nbsp; `} | {`
##### &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `"libGD.js": (gdPath: string) => Promise<void>,`
##### &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `"libGD.wasm"?: (gdPath: string) => Promise<void>,`
##### &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; `"libGD.js.mem"?: (gdPath: string) => Promise<void>,`
##### &nbsp;&nbsp;&nbsp;&nbsp; `}`
##### &nbsp;&nbsp; `}`
##### `}): Promise<WrappedGD>`

The entrypoint of the module. Accept a github release tag to specify a specific version to download and use or configuration object where:
- versionTag - optional github release tag
- user - optional github GDevelop project or fork owner.
- authToken - optional github private token for github API authorization 
- fetchProvider - optional configuration for libGD assets loading. You can provide next settings:
  - libGDPath - url to libGD assets
  - useReleaseAssets - defines to load assets from release attachments
  - libGD.js, libGD.wasm, libGD.js.mem - function providers to rely on for appropriate files loading

#### `WrappedGD.gd: gd`

The actual `gd` namespace of GDCore.

#### `WrappedGD.loadProject(projectLocation: string): Promise<gd.Project>`

Accepts a full path to a .json file, and returns a promise that resolves to the loaded `gd.Project` instance.

#### `WrappedGD.saveProject(project: gd.Project, fileName?: string, filePath?: string): Promise<void>`

Saves a `gd.Project` to a JSON file. The default path is `./` and the default filename `game.json`.
Returns a promise that resolves once the file is saved.

#### `WrappedGD.exportProject(project: gd.Project, outputDir: string, options?: Object): void`

Exports a project to a directory. Some options may be passed to the exporter, but they aren't officially documented. Returns a promise that resolves once the export is done.

#### `WrappedGD.reloadEventsFunctions(project): void`

Regenerates the code and reloads all events based extensions.

#### `WrappedGD.getRuntimePath(): string`

Get the path to the downloaded and built GDJS runtime.
