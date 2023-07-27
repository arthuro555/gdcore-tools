import { gd, loadProject, exportProject } from "../..";

const project = await loadProject("./game.json");
await exportProject(project, "GameExport");

// Get the scene and add the objects and instances from the list
const scene = project.getLayout(/* Scene name: */ "MyScene");
const instances = scene.getInitialInstances();
let offset = 1;
list.forEach((item) => {
  const textObjectName = "MyListItem_" + item;
  const object = gd.asTextObject(
    scene.insertNewObject(
      /* Project: */ project,
      /* Object type: */ "TextObject::Text",
      /* Object name: */ textObjectName,
      /* Position where to insert: */ scene.getObjectsCount()
    )
  );
  object.setString(item);
  object.setColor(
    Math.random() * 255,
    Math.random() * 255,
    Math.random() * 255
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

await saveProject(project, "new_game.json");
