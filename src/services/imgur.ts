import { ImgurClient } from "imgur";

import { IMGUR_CLIENT_ID } from "@config";

const client = new ImgurClient({ clientId: IMGUR_CLIENT_ID }); // Set your imgur client id here

const uploadToImgur = async (image64) => {
  try {
    const response = await client.upload({ image: image64, type: "base64" });
    return response.data.link;
  } catch (error) {
    console.log("Error Uploading: ");
    console.log(error);
    return "";
  }
};

export { uploadToImgur };
