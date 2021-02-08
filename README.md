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

#### `loadGD(version?: string): Promise<WrappedGD>`

The entrypoint of the module. Accept a github release tag to specify a specific version to download and use.

#### `WrappedGD.gd: gd`

The actual `gd` namespace of GDCore.

#### `WrappedGD.loadProject(projectLocation: string): Promise<gd.Project>`

Accepts a full path to a .json file, and returns a promise that resolves to the loaded `gd.Project` instance.

#### `WrappedGD.saveProject(project: gd.Project, fileName?: string, filePath?: string): Promise<void>`

Saves a `gd.Project` to a JSON file. The default path is `./` and the default filename `game.json`.
Returns a promise that resolves once the file is saved.

#### `WrappedGD.exportProject(project: gd.Project, outputDir: string, options?: Object): void`

Exports a project to a directory. Some options may be passed to the exporter, but they aren't officially documented. Returns a promise that resolves once the export is done.

#### `WrappedGD.getRuntimePath(): string`

Get the path to the downloaded and built GDJS runtime.
