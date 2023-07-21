import db from "@db";
import Logger from "@utils/logger";
import { Uploader } from "@ctypes/uploaders";
import { fetchAvatars } from "@services/discord";

const logger = Logger(module);

/**
 * Fetches Discord uploaders.
 * @param {Uploader[]} booksMessages - An array of book messages.
 * @returns {Promise<void>} - A promise that resolves once the uploaders are fetched and saved.
 */
const fetchUploaders = async (uploaders: Uploader[]) => {
  //TODO ENQUEUE UPLOADER JOBS FOR EACH
  //Map Uploaders to see if they exist first
  const uploadersWithAvatar = await fetchAvatars(uploaders);
  await saveUploaders(uploadersWithAvatar);
};

const getUnexistingUploaders = async (uploaders: Uploader[]) => {
  const existingUploaders = await db("uploaders")
    .whereIn(
      "uploader_id",
      uploaders.map((uploader) => uploader.uploader_id)
    )
    .select("uploader_id");
  logger.info("Amount of existingUploaders" + existingUploaders.length);
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
  await db.transaction(async (trx) => {
    for (const uploader of uploaders) {
      await trx.raw(
        `INSERT OR IGNORE INTO uploaders (uploader_id, name, avatar, source) VALUES (?, ?, ?, ?)`,
        [uploader.uploader_id, uploader.name, uploader.avatar, uploader.source]
      );
    }
  });
};

const updateUploaderAvatars = async () => {
  // Get all uploaders from DB
  const uploaders: Uploader[] = await db("uploaders").select();

  // Fetch latest avatars for each uploader
  const updatedUploaders = await fetchAvatars(uploaders);

  await db.transaction(async (trx) => {
    for (const updatedUploader of updatedUploaders) {
      const originalUploader = uploaders.find(
        (uploader) => uploader.uploader_id === updatedUploader.uploader_id
      );

      // If avatar has changed, update in DB
      if (
        originalUploader &&
        originalUploader.avatar !== updatedUploader.avatar
      ) {
        await trx("uploaders")
          .where("uploader_id", updatedUploader.uploader_id)
          .update({ avatar: updatedUploader.avatar });
      }
    }
  });
};

export {
  getUnexistingUploaders,
  saveUploaders,
  updateUploaderAvatars,
  checkIfUploaderExists,
  fetchUploaders,
};
