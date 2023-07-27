const { mapVector, mapFor } = require("../MapFor");
const { caseSensitiveSlug } = require("../CaseSensitiveSlug");

const mangleName = (name) => {
  return caseSensitiveSlug(name, "_", []);
};

/** Generate the namespace for a free function. */
const getFreeFunctionCodeNamespace = (eventsFunction, codeNamespacePrefix) => {
  return codeNamespacePrefix + "__" + mangleName(eventsFunction.getName());
};

/** Generate the namespace for a behavior function. */
const getBehaviorFunctionCodeNamespace = (
  eventsBasedBehavior,
  codeNamespacePrefix
) => {
  return codeNamespacePrefix + "__" + mangleName(eventsBasedBehavior.getName());
};

/** Generate the namespace for an object function. */
const getObjectFunctionCodeNamespace = (
  eventsBasedObject,
  codeNamespacePrefix
) => {
  return codeNamespacePrefix + "__" + mangleName(eventsBasedObject.getName());
};

module.exports.makeLoader = (gd) => {
  const { isExtensionLifecycleEventsFunction } =
    require("./MetadataDeclarationHelpers")(gd);

  const loader = {};

  /**
   * Load all events functions of a project in extensions
   */
  const loadProjectEventsFunctionsExtensions = (
    project,
    eventsFunctionCodeWriter
  ) => {
    return Promise.all(
      // First pass: generate extensions from the events functions extensions,
      // without writing code for the functions. This is useful as events in functions
      // could be using other functions, which would not yet be available as
      // extensions.
      mapFor(0, project.getEventsFunctionsExtensionsCount(), (i) => {
        return loadProjectEventsFunctionsExtension(
          project,
          project.getEventsFunctionsExtensionAt(i),
          { skipCodeGeneration: true, eventsFunctionCodeWriter }
        );
      })
    ).then(() =>
      Promise.all(
        // Second pass: generate extensions, including code.
        mapFor(0, project.getEventsFunctionsExtensionsCount(), (i) => {
          return loadProjectEventsFunctionsExtension(
            project,
            project.getEventsFunctionsExtensionAt(i),
            {
              skipCodeGeneration: false,
              eventsFunctionCodeWriter,
            }
          );
        })
      )
    );
  };
  loader.loadProjectEventsFunctionsExtensions =
    loadProjectEventsFunctionsExtensions;

  const loadProjectEventsFunctionsExtension = (
    project,
    eventsFunctionsExtension,
    options
  ) => {
    return generateEventsFunctionExtension(
      project,
      eventsFunctionsExtension,
      options
    ).then((extension) => {
      gd.JsPlatform.get().addNewExtension(extension);
      extension.delete();
    });
  };

  /**
   * Get the list of mandatory include files when using the
   * extension.
   */
  const getExtensionIncludeFiles = (
    project,
    eventsFunctionsExtension,
    options,
    codeNamespacePrefix
  ) => {
    return mapFor(
      0,
      eventsFunctionsExtension.getEventsFunctionsCount(),
      (i) => {
        const eventsFunction = eventsFunctionsExtension.getEventsFunctionAt(i);

        if (isExtensionLifecycleEventsFunction(eventsFunction.getName())) {
          const codeNamespace = getFreeFunctionCodeNamespace(
            eventsFunction,
            codeNamespacePrefix
          );
          const functionName = codeNamespace + ".func"; // TODO

          return options.eventsFunctionCodeWriter.getIncludeFileFor(
            functionName
          );
        }

        return null;
      }
    ).filter(Boolean);
  };

  /**
   * Generate the code for the events based extension
   */
  const generateEventsFunctionExtension = (
    project,
    eventsFunctionsExtension,
    options
  ) => {
    const extension = new gd.PlatformExtension();
    gd.MetadataDeclarationHelper.declareExtension(
      extension,
      eventsFunctionsExtension
    );

    const codeNamespacePrefix =
      "gdjs.evtsExt__" + mangleName(eventsFunctionsExtension.getName());

    const extensionIncludeFiles = getExtensionIncludeFiles(
      project,
      eventsFunctionsExtension,
      options,
      codeNamespacePrefix
    );
    const codeGenerationContext = {
      codeNamespacePrefix,
      extensionIncludeFiles,
    };

    return Promise.all(
      // Generate all behaviors and their functions
      mapVector(
        eventsFunctionsExtension.getEventsBasedBehaviors(),
        (eventsBasedBehavior) => {
          return generateBehavior(
            project,
            extension,
            eventsFunctionsExtension,
            eventsBasedBehavior,
            options,
            codeGenerationContext
          );
        }
      )
    )
      .then(() =>
        // Generate all objects and their functions
        Promise.all(
          mapVector(
            eventsFunctionsExtension.getEventsBasedObjects(),
            (eventsBasedObject) => {
              return generateObject(
                project,
                extension,
                eventsFunctionsExtension,
                eventsBasedObject,
                options,
                codeGenerationContext
              );
            }
          )
        )
      )
      .then(() =>
        // Generate all free functions
        Promise.all(
          mapFor(0, eventsFunctionsExtension.getEventsFunctionsCount(), (i) => {
            const eventsFunction =
              eventsFunctionsExtension.getEventsFunctionAt(i);
            return generateFreeFunction(
              project,
              extension,
              eventsFunctionsExtension,
              eventsFunction,
              options,
              codeGenerationContext
            );
          })
        )
      )
      .then((functionInfos) => {
        return extension;
      });
  };

  const generateFreeFunction = (
    project,
    extension,
    eventsFunctionsExtension,
    eventsFunction,
    options,
    codeGenerationContext
  ) => {
    const metadataDeclarationHelper = new gd.MetadataDeclarationHelper();
    const { functionMetadata } = generateFreeFunctionMetadata(
      project,
      extension,
      eventsFunctionsExtension,
      eventsFunction,
      options,
      codeGenerationContext,
      metadataDeclarationHelper
    );

    if (!options.skipCodeGeneration) {
      const includeFiles = new gd.SetString();
      const eventsFunctionsExtensionCodeGenerator =
        new gd.EventsFunctionsExtensionCodeGenerator(project);
      const codeNamespace = getFreeFunctionCodeNamespace(
        eventsFunction,
        codeGenerationContext.codeNamespacePrefix
      );
      const code =
        eventsFunctionsExtensionCodeGenerator.generateFreeEventsFunctionCompleteCode(
          eventsFunctionsExtension,
          eventsFunction,
          codeNamespace,
          includeFiles,
          // For now, always generate functions for runtime (this disables
          // generation of profiling for groups (see EventsCodeGenerator))
          // as extensions generated can be used either for preview or export.
          true
        );

      // Add any include file required by the function to the list
      // of include files for this function (so that when used, the "dependencies"
      // are transitively included).
      includeFiles
        .toNewVectorString()
        .toJSArray()
        .forEach((includeFile) => {
          functionMetadata.addIncludeFile(includeFile);
        });

      includeFiles.delete();
      eventsFunctionsExtensionCodeGenerator.delete();
      metadataDeclarationHelper.delete();

      // TODO Implement an helper function for free function names.
      const functionName = codeNamespace + ".func";
      return options.eventsFunctionCodeWriter
        .writeFunctionCode(functionName, code)
        .then(() => {});
    } else {
      // Skip code generation if no events function writer is provided.
      // This is the case during the "first pass", where all events functions extensions
      // are loaded as extensions but not code generated, as events in functions could
      // themselves be using functions that are not yet available in extensions.
      return Promise.resolve();
    }
  };

  const generateFreeFunctionMetadata = (
    project,
    extension,
    eventsFunctionsExtension,
    eventsFunction,
    options,
    codeGenerationContext,
    metadataDeclarationHelper
  ) => {
    const instructionOrExpression =
      metadataDeclarationHelper.generateFreeFunctionMetadata(
        project,
        extension,
        eventsFunctionsExtension,
        eventsFunction
      );
    const functionName = gd.MetadataDeclarationHelper.getFreeFunctionCodeName(
      eventsFunctionsExtension,
      eventsFunction
    );
    const functionFile =
      options.eventsFunctionCodeWriter.getIncludeFileFor(functionName);
    instructionOrExpression.setIncludeFile(functionFile);

    // Always include the extension include files when using a free function.
    codeGenerationContext.extensionIncludeFiles.forEach((includeFile) => {
      instructionOrExpression.addIncludeFile(includeFile);
    });

    // Skip code generation if no events function writer is provided.
    // This is the case during the "first pass", where all events functions extensions
    // are loaded as extensions but not code generated, as events in functions could
    // themselves be using functions that are not yet available in extensions.
    return {
      functionFile: functionFile,
      functionMetadata: instructionOrExpression,
    };
  };

  function generateBehavior(
    project,
    extension,
    eventsFunctionsExtension,
    eventsBasedBehavior,
    options,
    codeGenerationContext
  ) {
    return Promise.resolve().then(() => {
      const behaviorMethodMangledNames = new gd.MapStringString();
      const behaviorMetadata = generateBehaviorMetadata(
        project,
        extension,
        eventsFunctionsExtension,
        eventsBasedBehavior,
        options,
        codeGenerationContext,
        behaviorMethodMangledNames
      );

      // Generate code for the behavior and its methods
      if (!options.skipCodeGeneration) {
        const codeNamespace = getBehaviorFunctionCodeNamespace(
          eventsBasedBehavior,
          codeGenerationContext.codeNamespacePrefix
        );
        const includeFiles = new gd.SetString();
        const behaviorCodeGenerator = new gd.BehaviorCodeGenerator(project);
        const code = behaviorCodeGenerator.generateRuntimeBehaviorCompleteCode(
          eventsFunctionsExtension.getName(),
          eventsBasedBehavior,
          codeNamespace,
          behaviorMethodMangledNames,
          includeFiles,

          // For now, always generate functions for runtime (this disables
          // generation of profiling for groups (see EventsCodeGenerator))
          // as extensions generated can be used either for preview or export.
          true
        );
        behaviorCodeGenerator.delete();
        behaviorMethodMangledNames.delete();

        // Add any include file required by the functions to the list
        // of include files for this behavior (so that when used, the "dependencies"
        // are transitively included).
        includeFiles
          .toNewVectorString()
          .toJSArray()
          .forEach((includeFile) => {
            behaviorMetadata.addIncludeFile(includeFile);
          });

        includeFiles.delete();

        return options.eventsFunctionCodeWriter.writeBehaviorCode(
          codeNamespace,
          code
        );
      } else {
        // Skip code generation
        behaviorMethodMangledNames.delete();
        return Promise.resolve();
      }
    });
  }

  function generateBehaviorMetadata(
    project,
    extension,
    eventsFunctionsExtension,
    eventsBasedBehavior,
    options,
    codeGenerationContext,
    behaviorMethodMangledNames
  ) {
    const behaviorMetadata =
      gd.MetadataDeclarationHelper.generateBehaviorMetadata(
        project,
        extension,
        eventsFunctionsExtension,
        eventsBasedBehavior,
        behaviorMethodMangledNames
      );

    const codeNamespace = getBehaviorFunctionCodeNamespace(
      eventsBasedBehavior,
      codeGenerationContext.codeNamespacePrefix
    );
    const includeFile =
      options.eventsFunctionCodeWriter.getIncludeFileFor(codeNamespace);

    behaviorMetadata.setIncludeFile(includeFile);

    // Always include the extension include files when using a behavior.
    codeGenerationContext.extensionIncludeFiles.forEach((includeFile) => {
      behaviorMetadata.addIncludeFile(includeFile);
    });

    return behaviorMetadata;
  }

  function generateObject(
    project,
    extension,
    eventsFunctionsExtension,
    eventsBasedObject,
    options,
    codeGenerationContext
  ) {
    return Promise.resolve().then(() => {
      const objectMethodMangledNames = new gd.MapStringString();
      const objectMetadata = generateObjectMetadata(
        project,
        extension,
        eventsFunctionsExtension,
        eventsBasedObject,
        options,
        codeGenerationContext,
        objectMethodMangledNames
      );

      // Generate code for the object and its methods
      if (!options.skipCodeGeneration) {
        const codeNamespace = getObjectFunctionCodeNamespace(
          eventsBasedObject,
          codeGenerationContext.codeNamespacePrefix
        );
        const includeFiles = new gd.SetString();
        const objectCodeGenerator = new gd.ObjectCodeGenerator(project);
        const code = objectCodeGenerator.generateRuntimeObjectCompleteCode(
          eventsFunctionsExtension.getName(),
          eventsBasedObject,
          codeNamespace,
          objectMethodMangledNames,
          includeFiles,

          // For now, always generate functions for runtime (this disables
          // generation of profiling for groups (see EventsCodeGenerator))
          // as extensions generated can be used either for preview or export.
          true
        );
        objectCodeGenerator.delete();
        objectMethodMangledNames.delete();

        // Add any include file required by the functions to the list
        // of include files for this object (so that when used, the "dependencies"
        // are transitively included).
        includeFiles
          .toNewVectorString()
          .toJSArray()
          .forEach((includeFile) => {
            objectMetadata.addIncludeFile(includeFile);
          });

        includeFiles.delete();

        return options.eventsFunctionCodeWriter.writeObjectCode(
          codeNamespace,
          code
        );
      } else {
        // Skip code generation
        objectMethodMangledNames.delete();
        return Promise.resolve();
      }
    });
  }

  function generateObjectMetadata(
    project,
    extension,
    eventsFunctionsExtension,
    eventsBasedObject,
    options,
    codeGenerationContext,
    objectMethodMangledNames
  ) {
    const objectMetadata = gd.MetadataDeclarationHelper.generateObjectMetadata(
      project,
      extension,
      eventsFunctionsExtension,
      eventsBasedObject,
      objectMethodMangledNames
    );

    const codeNamespace = getObjectFunctionCodeNamespace(
      eventsBasedObject,
      codeGenerationContext.codeNamespacePrefix
    );
    // TODO EBO Handle name collision between objects and behaviors.
    const includeFile =
      options.eventsFunctionCodeWriter.getIncludeFileFor(codeNamespace);

    objectMetadata.setIncludeFile(includeFile);

    // Always include the extension include files when using an object.
    codeGenerationContext.extensionIncludeFiles.forEach((includeFile) => {
      objectMetadata.addIncludeFile(includeFile);
    });

    return objectMetadata;
  }

  /**
   * Unload all extensions providing events functions of a project
   */
  const unloadProjectEventsFunctionsExtensions = (project) => {
    return Promise.all(
      mapFor(0, project.getEventsFunctionsExtensionsCount(), (i) => {
        gd.JsPlatform.get().removeExtension(
          project.getEventsFunctionsExtensionAt(i).getName()
        );
      })
    );
  };
  loader.unloadProjectEventsFunctionsExtensions =
    unloadProjectEventsFunctionsExtensions;

  /**
   * Given metadata about an instruction or an expression, tells if this was created
   * from an event function.
   */
  const isAnEventFunctionMetadata = (instructionOrExpression) => {
    const parametersCount = instructionOrExpression.getParametersCount();
    if (parametersCount <= 0) return false;

    return (
      instructionOrExpression.getParameter(parametersCount - 1).getType() ===
      "eventsFunctionContext"
    );
  };
  loader.isAnEventFunctionMetadata = isAnEventFunctionMetadata;

  /**
   * Get back the name a function from its type.
   * See also getFreeEventsFunctionType for the reverse operation.
   */
  const getFunctionNameFromType = (type) => {
    const parts = type.split("::");
    if (!parts.length)
      return {
        name: "",
        behaviorName: "",
        extensionName: "",
      };

    return {
      name: parts[parts.length - 1],
      behaviorName: parts.length > 2 ? parts[1] : undefined,
      extensionName: parts[0],
    };
  };
  loader.getFunctionNameFromType = getFunctionNameFromType;

  /**
   * Get the type of a Events Function.
   * See also getFunctionNameFromType for the reverse operation.
   */
  const getFreeEventsFunctionType = (extensionName, eventsFunction) => {
    return extensionName + "::" + eventsFunction.getName();
  };
  loader.getFreeEventsFunctionType = getFreeEventsFunctionType;

  /**
   * Return the index of the first parameter to be shown to the user:
   * * 0 for a behavior "method",
   * * 1 for a free function (as the first parameter is by convention the runtimeScene).
   */
  const getParametersIndexOffset = (isEventsBasedBehaviorMethod) => {
    return isEventsBasedBehaviorMethod
      ? 0 /*In the case of a behavior events function, the first two parameters are by convention the "Object" and "Behavior" */
      : 1; /*In the case of a free events function (i.e: not tied to a behavior), the first parameter is by convention the current scene and is not shown.*/
  };
  loader.getParametersIndexOffset = getParametersIndexOffset;

  return loader;
};
