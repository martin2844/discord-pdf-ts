import { config } from "dotenv";
config();

export const {
  PORT,
  BOT_TOKEN,
  IMGUR_CLIENT_ID,
  GITHUB_PAT,
  BOOK_CHANNEL_ID,
  CLOUDINARY_KEY,
  CLOUDINARY_SECRET,
  CLOUDINARY_NAME,
  OPENAI_KEY,
} = process.env;
