//@ts-ignore TS doesn't like "assert" but it's the keyword node currently uses.
import list from "./mylist.json" assert { type: "json" };
import { gd, loadProject, saveProject } from "gdcore-tools";

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = dirname(fileURLToPath(import.meta.url));

const project = await loadProject(__dirname + "/game.json");

// Get the scene and add the objects and instances from the list
const scene = project.getLayout(/* Scene name: */ "MyScene");
const objects = scene.getObjects();
const instances = scene.getInitialInstances();
let offset = 1;

list.forEach((item) => {
  const textObjectName = "MyListItem_" + item;
  const object = gd.asTextObjectConfiguration(
    objects
      .insertNewObject(
        /* Project: */ project,
        /* Object type: */ "TextObject::Text",
        /* Object name: */ textObjectName,
        /* Position where to insert: */ instances.getInstancesCount()
      )
      .getConfiguration()
  );
  object.setText("test");
  object.setColor(
    `${Math.random() * 255};${Math.random() * 255};${Math.random() * 255}`
  );

  const textObjectInstance = instances.insertNewInitialInstance();
  const spriteObjectInstance = instances.insertNewInitialInstance();
  textObjectInstance.setObjectName(textObjectName);
  spriteObjectInstance.setObjectName("Button");
  textObjectInstance.setX(50);
  spriteObjectInstance.setX(40);
  textObjectInstance.setY(70 * offset + 15);
  spriteObjectInstance.setY(70 * offset++);
  textObjectInstance.setZOrder(1);
  spriteObjectInstance.setZOrder(0);

  spriteObjectInstance.setHasCustomSize(true);
  spriteObjectInstance.setCustomHeight(48);
  spriteObjectInstance.setCustomWidth(96);
});

await saveProject(project, __dirname + "/new_game.json");
