export function createProjectLoader({ gd, unsplit, loadProjectEventsFunctionsExtensions, makeLocalEventsFunctionCodeWriter, }: {
    gd: typeof import("../gd.js");
    unsplit: (object: any, opts: {
        getReferencePartialObject: (path: string) => Promise<string>;
        isReferenceMagicPropertyName: string;
        maxUnsplitDepth: number;
    }) => any;
    loadProjectEventsFunctionsExtensions: (project: import("../gd.js").Project, writer: any, i18n: any) => Promise<void>;
    makeLocalEventsFunctionCodeWriter: (opts: {
        onWriteFile: () => void;
    }) => any;
}): (projectFilePath: string) => Promise<gd.Project>;
export function createProjectSaver({ gd, split, getSlugifiedUniqueNameFromProperty, }: {
    gd: typeof import("../gd.js");
    split: (object: any, opts: {
        pathSeparator: string;
        getArrayItemReferenceName: (object: Object, currentReference: string) => string;
        shouldSplit: (path: string) => boolean;
        isReferenceMagicPropertyName: string;
    }) => {
        reference: string;
        object: {};
    }[];
    getSlugifiedUniqueNameFromProperty: (propertyName: string) => (object: Object, currentReference: string) => string;
}): (project: gd.Project, pathToProjectFile?: string) => Promise<void>;
