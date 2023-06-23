import db from "@db";
import { Uploader } from "@ctypes/uploaders";

const getUnexistingUploaders = async (uploaders: Uploader[]) => {
  const existingUploaders = await db("uploaders")
    .whereIn(
      "uploader_id",
      uploaders.map((uploader) => uploader.uploader_id)
    )
    .select("uploader_id");
  console.log("existingUploaders", existingUploaders);
  // Return only the uploaders that don't exist in the database
  return uploaders.filter((uploader) => {
    return !existingUploaders.find(
      (existingUploader) =>
        existingUploader.uploader_id === uploader.uploader_id
    );
  });
};

const checkIfUploaderExists = async (uploader_id: string) => {
  const existingUploader = await db("uploaders")
    .where("uploader_id", uploader_id)
    .select("uploader_id");
  return !!existingUploader.length;
};

const saveUploaders = async (uploaders: Uploader[]) => {
  return db("uploaders").insert(uploaders);
};

export { getUnexistingUploaders, saveUploaders, checkIfUploaderExists };
