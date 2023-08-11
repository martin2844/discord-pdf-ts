import Logger from "@utils/logger";
import { cloudinaryUpload } from "@services/cloudinary";
import { IMGUR_CLIENT_ID } from "@config";

import { ImgurClient } from "imgur";

const logger = Logger(module);

const client = new ImgurClient({ clientId: IMGUR_CLIENT_ID }); // Set your imgur client id here

/**
 * Uploads an image to Imgur.
 * @param {string} image64 - The base64-encoded image to upload.
 * @returns {Promise<string>} - A promise that resolves to the URL of the uploaded image.
 */
const uploadToImgur = async (image64) => {
  try {
    if (!image64) {
      logger.warn(
        "Failed to get an image to upload, check libs necessary for PDF2PIC"
      );
      return "";
    }
    const response = await client.upload({ image: image64, type: "base64" });
    if (response.status !== 200) {
      logger.error("@@@ Error Uploading to Imgur: " + response.status);
      return false;
    }
    return response.data.link;
  } catch (error) {
    logger.error("@@@ Error Uploading to Imgur");
    if (error.message && typeof error.message === "string") {
      logger.error(error.message);
    }
    return "";
  }
};

export { uploadToImgur };
