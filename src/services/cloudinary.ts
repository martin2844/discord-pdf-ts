import { v2 as cloudinary } from "cloudinary";
import { CLOUDINARY_KEY, CLOUDINARY_SECRET, CLOUDINARY_NAME } from "@config";
import Logger from "@utils/logger";

const logger = Logger(module);

// Cloudinary configuration
cloudinary.config({
  cloud_name: CLOUDINARY_NAME,
  api_key: CLOUDINARY_KEY,
  api_secret: CLOUDINARY_SECRET,
});

async function cloudinaryUpload(base64Image: string): Promise<string> {
  base64Image = base64Image.replace(/\s/g, "");
  const completeImageData = "data:image/png;base64," + base64Image;
  try {
    const response = await cloudinary.uploader.upload(completeImageData, {
      resource_type: "image",
      folder: "discord-bot",
    });
    logger.info("Upload to cloudinary succesful");
    return response.url || response.secure_url;
  } catch (error) {
    console.log(error);
    logger.error("Upload error: ", JSON.stringify(error));
  }
}

export { cloudinaryUpload };
