/**
 * Tool function to save a serializable object to a JS object.
 * Most gd.* objects are "serializable", meaning they have a serializeTo
 * and unserializeFrom method.
 *
 * @param {*} serializable
 * @param {*} methodName The name of the serialization method. "unserializeFrom" by default
 */
module.exports.serializeToJSObject = function(gd, serializable, methodName) {
  methodName = methodName || "serializeTo";
  const serializedElement = new gd.SerializerElement();
  serializable[methodName](serializedElement);
  const object = JSON.parse(gd.Serializer.toJSON(serializedElement));
  serializedElement.delete();

  return object;
}

/**
 * Tool function to save a serializable object to a JSON.
 * Most gd.* objects are "serializable", meaning they have a serializeTo
 * and unserializeFrom method.
 *
 * @param {*} serializable
 * @param {*} methodName The name of the serialization method. "unserializeFrom" by default
 */
module.exports.serializeToJSON = function(gd, serializable, methodName) {
  methodName = methodName || "serializeTo";
  const serializedElement = new gd.SerializerElement();
  serializable[methodName](serializedElement);
  const json = gd.Serializer.toJSON(serializedElement);
  serializedElement.delete();

  return json;
}
